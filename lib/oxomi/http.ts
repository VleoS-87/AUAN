/**
 * HTTP-Zugriff auf OXOMI mit Drosselung und Wiederholungslogik.
 *
 * Grundsatz aus UEBERGABE.md Abschnitt 5: Ein langsames OXOMI verzoegert einen
 * Auftrag, bricht ihn nie ab. Deshalb wird gedrosselt, wiederholt und mit
 * Zeitlimit gearbeitet; Fehler werden als Ergebnis zurueckgegeben statt geworfen.
 */
import type { OxomiKonfiguration } from './config';

export interface AufrufErgebnis {
  ok: boolean;
  httpStatus?: number;
  /** Geparste JSON-Antwort, falls die Antwort JSON war. */
  koerper?: unknown;
  /** Roher Antworttext, gekuerzt. Nur fuer die Diagnose. */
  rohtext?: string;
  fehler?: string;
  dauerMs: number;
  /** Wie oft insgesamt versucht wurde. */
  versuche: number;
}

const MAX_ROHTEXT = 20_000;

/** Einfache Drossel: begrenzt Parallelitaet und haelt einen Mindestabstand ein. */
export class Drossel {
  private laufend = 0;
  private warteschlange: Array<() => void> = [];
  private letzterStart = 0;

  private readonly maxParallel: number;
  private readonly mindestabstandMs: number;

  constructor(maxParallel: number, mindestabstandMs: number) {
    this.maxParallel = maxParallel;
    this.mindestabstandMs = mindestabstandMs;
  }

  async fuehreAus<T>(aufgabe: () => Promise<T>): Promise<T> {
    await this.platzHolen();
    try {
      const abstand = this.mindestabstandMs - (Date.now() - this.letzterStart);
      if (abstand > 0) await warte(abstand);
      this.letzterStart = Date.now();
      return await aufgabe();
    } finally {
      this.platzFreigeben();
    }
  }

  private platzHolen(): Promise<void> {
    if (this.laufend < this.maxParallel) {
      this.laufend += 1;
      return Promise.resolve();
    }
    return new Promise<void>((aufloesen) => {
      this.warteschlange.push(() => {
        this.laufend += 1;
        aufloesen();
      });
    });
  }

  private platzFreigeben(): void {
    this.laufend -= 1;
    const naechster = this.warteschlange.shift();
    if (naechster) naechster();
  }
}

function warte(ms: number): Promise<void> {
  return new Promise((aufloesen) => setTimeout(aufloesen, ms));
}

/** Bei diesen Zustaenden lohnt ein zweiter Versuch. */
function wiederholbar(status: number | undefined): boolean {
  if (status === undefined) return true; // Netzfehler oder Zeitueberschreitung
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export interface AufrufOptionen {
  /** GET (Standard) oder POST. Die Produktauskunft V2 verlangt POST mit JSON-Rumpf. */
  methode?: 'GET' | 'POST';
  /** Rumpf fuer POST. Wird als JSON gesendet. */
  koerper?: unknown;
}

export async function rufeAuf(
  url: string,
  konfiguration: Pick<OxomiKonfiguration, 'zeitlimitMs' | 'maxWiederholungen'>,
  drossel: Drossel,
  optionen: AufrufOptionen = {},
): Promise<AufrufErgebnis> {
  const start = Date.now();
  let versuche = 0;
  let letzterFehler: string | undefined;
  let letzterStatus: number | undefined;

  const maxVersuche = konfiguration.maxWiederholungen + 1;

  while (versuche < maxVersuche) {
    versuche += 1;
    const ergebnis = await drossel.fuehreAus(() => einVersuch(url, konfiguration.zeitlimitMs, optionen));

    if (ergebnis.ok || !wiederholbar(ergebnis.httpStatus)) {
      return { ...ergebnis, dauerMs: Date.now() - start, versuche };
    }

    letzterFehler = ergebnis.fehler;
    letzterStatus = ergebnis.httpStatus;

    if (versuche < maxVersuche) {
      await warte(400 * 2 ** (versuche - 1)); // 400 ms, 800 ms, 1600 ms ...
    }
  }

  return {
    ok: false,
    httpStatus: letzterStatus,
    fehler: letzterFehler ?? 'OXOMI hat nach mehreren Versuchen nicht geantwortet.',
    dauerMs: Date.now() - start,
    versuche,
  };
}

async function einVersuch(
  url: string,
  zeitlimitMs: number,
  optionen: AufrufOptionen,
): Promise<Omit<AufrufErgebnis, 'dauerMs' | 'versuche'>> {
  const abbruch = new AbortController();
  const wecker = setTimeout(() => abbruch.abort(), zeitlimitMs);
  const methode = optionen.methode ?? 'GET';

  const kopfzeilen: Record<string, string> = {
    Accept: 'application/json, text/plain;q=0.8, */*;q=0.5',
  };
  if (methode === 'POST') kopfzeilen['Content-Type'] = 'application/json';

  try {
    const antwort = await fetch(url, {
      method: methode,
      signal: abbruch.signal,
      headers: kopfzeilen,
      body: methode === 'POST' ? JSON.stringify(optionen.koerper ?? {}) : undefined,
      cache: 'no-store',
    });

    const rohtext = (await antwort.text()).slice(0, MAX_ROHTEXT);

    let koerper: unknown;
    try {
      koerper = JSON.parse(rohtext);
    } catch {
      koerper = undefined;
    }

    return {
      ok: antwort.ok,
      httpStatus: antwort.status,
      koerper,
      rohtext,
      fehler: antwort.ok ? undefined : `OXOMI antwortete mit HTTP ${antwort.status}.`,
    };
  } catch (fehler) {
    const abgebrochen = fehler instanceof Error && fehler.name === 'AbortError';
    return {
      ok: false,
      fehler: abgebrochen
        ? `Zeitueberschreitung nach ${zeitlimitMs} ms.`
        : `Netzfehler: ${fehler instanceof Error ? fehler.message : String(fehler)}`,
    };
  } finally {
    clearTimeout(wecker);
  }
}
