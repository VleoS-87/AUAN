/**
 * Anreicherung eines Artikels: Cache -> OXOMI -> Cache.
 *
 * Das ist der Kern des Bausteins. Ablauf je Artikel:
 *  1. Im Artikel-Cache nachsehen. Treffer, der nicht veraltet ist -> fertig.
 *  2. Sonst die Suchwege der Matching-Kaskade der Reihe nach gegen OXOMI fahren.
 *  3. Antwort durch die Preissperre fuehren, auswerten, Kapitel vorschlagen.
 *  4. Ergebnis in den Cache schreiben (auch ein sauberes "nicht gefunden").
 *
 * Technische Stoerungen werden nie in den Cache geschrieben: Ein kurzzeitig
 * nicht erreichbares OXOMI darf keinen dauerhaft falschen Eintrag hinterlassen.
 */
import { Drossel, rufeAuf } from './http';
import { ladeKonfiguration, fehlendeZugangsdaten, type OxomiKonfiguration } from './config';
import { baueZugangsparameter } from './token';
import { entfernePreisfelder } from './preissperre';
import { werteAus } from './auswertung';
import { schlageKapitelVor } from './kapitel';
import { SUCHWEGE } from './suchwege';
import { bildeCacheSchluessel, type ArtikelCacheSpeicher } from './cache';
import type {
  AnreicherungsOptionen,
  ArtikelDaten,
  ArtikelSchluessel,
  AufrufDiagnose,
  Trefferstatus,
} from './types';

export interface AnreicherungsErgebnis {
  daten: ArtikelDaten;
  /** Nur gefuellt, wenn mitDiagnose gesetzt war. */
  diagnose: AufrufDiagnose[];
}

const STANDARD_MAX_ALTER_TAGE = 90;
const AUSZUG_LAENGE = 1200;

export interface AnreicherungsUmgebung {
  cache?: ArtikelCacheSpeicher | null;
  konfiguration?: OxomiKonfiguration;
  drossel?: Drossel;
  /** Fuer Tests ueberschreibbar. */
  jetzt?: () => number;
}

export async function reichereAn(
  schluessel: ArtikelSchluessel,
  optionen: AnreicherungsOptionen = {},
  umgebung: AnreicherungsUmgebung = {},
): Promise<AnreicherungsErgebnis> {
  const jetzt = umgebung.jetzt ?? Date.now;
  const cacheSchluessel = bildeCacheSchluessel(schluessel);
  const diagnose: AufrufDiagnose[] = [];

  // ---- 1. Cache ---------------------------------------------------------
  if (!optionen.cacheUmgehen && umgebung.cache) {
    const eintrag = await umgebung.cache.lesen(schluessel).catch(() => null);
    if (eintrag && !istVeraltet(eintrag.stand, optionen.maxAlterTage, jetzt())) {
      return {
        daten: { ...eintrag.daten, quelle: 'cache' },
        diagnose,
      };
    }
  }

  // ---- 2. Zugangsdaten --------------------------------------------------
  const fehlt = fehlendeZugangsdaten();
  if (fehlt.length > 0 && !umgebung.konfiguration) {
    return {
      daten: leer(schluessel, cacheSchluessel, 'nicht_konfiguriert', jetzt(), [
        `OXOMI-Zugangsdaten unvollstaendig (${fehlt.join(', ')}). Es wurde nicht angefragt.`,
      ]),
      diagnose,
    };
  }

  const konfiguration = umgebung.konfiguration ?? ladeKonfiguration();
  const drossel =
    umgebung.drossel ?? new Drossel(konfiguration.maxParallel, konfiguration.mindestabstandMs);
  const zugang = baueZugangsparameter(konfiguration, jetzt());

  // ---- 3. Suchwege ------------------------------------------------------
  const hinweise: string[] = [];
  let letzterFehler: string | undefined;

  for (const weg of SUCHWEGE) {
    const params = weg.params(schluessel);
    if (!params) continue;

    const url = baueUrl(konfiguration.basisUrl, weg.pfad, { ...zugang, ...params });
    const ergebnis = await rufeAuf(url, konfiguration, drossel);

    const rumpfSicher = ergebnis.koerper === undefined ? undefined : entfernePreisfelder(ergebnis.koerper);
    const bewertung = ergebnis.ok && rumpfSicher !== undefined ? bewerte(rumpfSicher) : null;

    if (optionen.mitDiagnose) {
      diagnose.push({
        suchweg: weg.id,
        beschreibung: weg.beschreibung,
        urlOhneGeheimnis: ohneGeheimnis(url),
        httpStatus: ergebnis.httpStatus,
        dauerMs: ergebnis.dauerMs,
        fehler: ergebnis.fehler,
        antwortAuszug: auszug(rumpfSicher, ergebnis.rohtext),
        treffer: Boolean(bewertung?.gefunden),
      });
    }

    if (!ergebnis.ok) {
      letzterFehler = ergebnis.fehler;
      continue;
    }

    if (rumpfSicher === undefined) {
      letzterFehler = 'OXOMI hat geantwortet, aber kein auswertbares JSON geliefert.';
      continue;
    }

    if (!bewertung?.gefunden) {
      if (bewertung?.hinweis) hinweise.push(`${weg.beschreibung}: ${bewertung.hinweis}`);
      continue;
    }

    // Treffer.
    const aus = werteAus(rumpfSicher);
    const status: Trefferstatus = aus.bilder.length > 0 && aus.fakten.length > 0 ? 'treffer' : 'teiltreffer';

    if (aus.bilder.length === 0) hinweise.push('OXOMI liefert kein Bild zu diesem Artikel.');
    if (aus.fakten.length === 0) hinweise.push('OXOMI liefert keine Merkmale zu diesem Artikel.');
    if (!aus.eclass) hinweise.push('Keine eCl@ss-Klassifikation in der Antwort.');

    const daten: ArtikelDaten = {
      cacheSchluessel,
      schluessel,
      status,
      bezeichnung: aus.bezeichnung,
      langtext: aus.langtext,
      hersteller: aus.hersteller ?? schluessel.hersteller ?? undefined,
      serie: aus.serie,
      bilder: aus.bilder,
      fakten: aus.fakten,
      eclass: aus.eclass,
      dokumente: aus.dokumente,
      kapitelvorschlag: schlageKapitelVor({
        eclassCode: aus.eclass?.code,
        eclassBezeichnung: aus.eclass?.bezeichnung,
        bezeichnung: aus.bezeichnung ?? null,
      }),
      quelle: 'oxomi',
      stand: new Date(jetzt()).toISOString(),
      suchweg: weg.id,
      hinweise,
    };

    await schreibeSicher(umgebung.cache, daten);
    return { daten, diagnose };
  }

  // ---- 4. Kein Weg hat getroffen ---------------------------------------
  const istStoerung = Boolean(letzterFehler);
  const status: Trefferstatus = istStoerung ? 'fehler' : 'kein_treffer';

  const abschluss = leer(schluessel, cacheSchluessel, status, jetzt(), [
    ...hinweise,
    istStoerung
      ? `Kein Ergebnis wegen einer Stoerung: ${letzterFehler}`
      : 'OXOMI kennt diesen Artikel unter keiner der gepruefen Nummern.',
  ]);

  // Nur ein sauberes "nicht gefunden" wird gemerkt, eine Stoerung nie.
  if (!istStoerung) await schreibeSicher(umgebung.cache, abschluss);

  return { daten: abschluss, diagnose };
}

/** Mehrere Artikel anreichern. Die Drossel begrenzt die Last auf OXOMI. */
export async function reichereMehrereAn(
  schluessel: ReadonlyArray<ArtikelSchluessel>,
  optionen: AnreicherungsOptionen = {},
  umgebung: AnreicherungsUmgebung = {},
): Promise<AnreicherungsErgebnis[]> {
  const konfiguration = umgebung.konfiguration;
  const drossel =
    umgebung.drossel ??
    new Drossel(konfiguration?.maxParallel ?? 3, konfiguration?.mindestabstandMs ?? 120);

  return Promise.all(
    schluessel.map((s) => reichereAn(s, optionen, { ...umgebung, drossel })),
  );
}

// -------------------------------------------------------------------------

function leer(
  schluessel: ArtikelSchluessel,
  cacheSchluessel: string,
  status: Trefferstatus,
  jetztMs: number,
  hinweise: string[],
): ArtikelDaten {
  return {
    cacheSchluessel,
    schluessel,
    status,
    hersteller: schluessel.hersteller ?? undefined,
    bilder: [],
    fakten: [],
    eclass: null,
    dokumente: [],
    kapitelvorschlag: { kapitel: null, grundlage: 'kein_vorschlag' },
    quelle: 'oxomi',
    stand: new Date(jetztMs).toISOString(),
    hinweise,
  };
}

async function schreibeSicher(cache: ArtikelCacheSpeicher | null | undefined, daten: ArtikelDaten) {
  if (!cache) return;
  try {
    await cache.schreiben(daten);
  } catch {
    // Ein nicht schreibbarer Cache darf die Anreicherung nicht zerstoeren.
    daten.hinweise.push('Ergebnis konnte nicht in den Artikel-Cache geschrieben werden.');
  }
}

function istVeraltet(stand: Date, maxAlterTage: number | undefined, jetztMs: number): boolean {
  const grenze = (maxAlterTage ?? STANDARD_MAX_ALTER_TAGE) * 86_400_000;
  return jetztMs - stand.getTime() > grenze;
}

export function baueUrl(basisUrl: string, pfad: string, params: Record<string, string>): string {
  const url = new URL(pfad, basisUrl.endsWith('/') ? basisUrl : `${basisUrl}/`);
  for (const [name, wert] of Object.entries(params)) url.searchParams.set(name, wert);
  return url.toString();
}

/** Ersetzt das Zugangstoken in einer Adresse, damit es nirgends sichtbar wird. */
export function ohneGeheimnis(url: string): string {
  return url.replace(/(accessToken=)[^&]*/gi, '$1***');
}

interface Bewertung {
  gefunden: boolean;
  hinweis?: string;
}

/** Hat OXOMI etwas geliefert, das wie ein Artikel aussieht? */
export function bewerte(rumpf: unknown): Bewertung {
  if (rumpf === null || typeof rumpf !== 'object') {
    return { gefunden: false, hinweis: 'Antwort war kein Objekt.' };
  }

  const objekt = rumpf as Record<string, unknown>;

  for (const [schluessel, wert] of Object.entries(objekt)) {
    if (/^(error|fehler|errormessage)$/i.test(schluessel) && wert) {
      return { gefunden: false, hinweis: `OXOMI meldet: ${String(wert).slice(0, 200)}` };
    }
    if (/^(success|erfolg|ok)$/i.test(schluessel) && wert === false) {
      return { gefunden: false, hinweis: 'OXOMI meldet einen erfolglosen Aufruf.' };
    }
    if (/^(found|gefunden|exists)$/i.test(schluessel) && wert === false) {
      return { gefunden: false, hinweis: 'OXOMI kennt den Artikel nicht.' };
    }
  }

  const aus = werteAus(rumpf);
  const etwasDa =
    aus.artikelObjekte > 0 ||
    aus.bilder.length > 0 ||
    aus.fakten.length > 0 ||
    Boolean(aus.bezeichnung) ||
    Boolean(aus.eclass);

  return etwasDa ? { gefunden: true } : { gefunden: false, hinweis: 'Antwort enthielt keine Artikeldaten.' };
}

function auszug(rumpf: unknown, rohtext: string | undefined): string | undefined {
  if (rumpf !== undefined) {
    try {
      return JSON.stringify(rumpf, null, 2).slice(0, AUSZUG_LAENGE);
    } catch {
      /* faellt auf den Rohtext zurueck */
    }
  }
  if (!rohtext) return undefined;
  // Ungeparster Rohtext laesst sich nicht feldweise preisbereinigen. Deshalb
  // wird er nur gezeigt, wenn er sicher keine Preisangabe enthaelt (Grundregel 1).
  if (enthaeltPreisverdacht(rohtext)) {
    return '[Antwort war kein JSON und enthielt moegliche Preisangaben - Anzeige unterdrueckt]';
  }
  return rohtext.slice(0, 600);
}

const PREISVERDACHT =
  /(preis|netto|brutto|betrag|rabatt|kondition|w(ae|ä)hrung|currency|price|discount|\bEUR\b|€)/i;

function enthaeltPreisverdacht(text: string): boolean {
  return PREISVERDACHT.test(text);
}
