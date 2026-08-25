/**
 * Kalibrierlauf im Build.
 *
 * Warum im Build und nicht ueber die Testroute: Die Testroute ist mit
 * APP_SECRET geschuetzt, und der Schluessel liegt bewusst nur beim
 * Auftraggeber. Der Kalibrierlauf braucht aber echte OXOMI-Antworten, um zu
 * bestimmen, welcher Dienstpfad im Pietsch-Portal antwortet. Deshalb laeuft er
 * im Vercel-Build, wo die Zugangsdaten ohnehin liegen, und schreibt sein
 * Ergebnis ins Build-Protokoll.
 *
 * Er laeuft NUR, wenn die Marker-Datei scripts/KALIBRIERUNG_ANFORDERN im Repo
 * liegt. Ohne Marker beendet er sich sofort, ohne eine einzige Anfrage. So ist
 * im Repo jederzeit sichtbar, ob im Build nach aussen telefoniert wird.
 *
 * Er gibt niemals Zugangsdaten aus: Das Token wird in jeder Adresse ersetzt,
 * das Shared Secret erscheint nirgends, und jede Antwort laeuft vorher durch
 * die Preissperre.
 *
 * Der Lauf bricht den Build nie ab.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fehlendeZugangsdaten, ladeKonfiguration } from '../lib/oxomi/config.ts';
import { Drossel, rufeAuf } from '../lib/oxomi/http.ts';
import { entfernePreisfelder } from '../lib/oxomi/preissperre.ts';
import { KALIBRIER_PFADE } from '../lib/oxomi/suchwege.ts';
import { baueZugangsparameter } from '../lib/oxomi/token.ts';

const MARKER = join(process.cwd(), 'scripts', 'KALIBRIERUNG_ANFORDERN');
const RAHMEN = '='.repeat(72);
const AUSZUG = 900;

/** Testartikel aus testdaten/artikel/artikel_testliste.csv (Eigenmarke aktiv4YOU). */
const TESTARTIKEL = {
  hersteller: 'hansgrohe',
  werksnummer: '60133450',
  pietschNr: '054107001',
  ean: '4059625478899',
};

/** Parametervarianten, weil die Dokumentation beide Schreibweisen zeigt. */
const PARAMETERFORMEN: Array<{ name: string; params: Record<string, string> }> = [
  {
    name: 'unnummeriert (itemNumber, supplierNumber)',
    params: { itemNumber: TESTARTIKEL.werksnummer, supplierNumber: TESTARTIKEL.hersteller },
  },
  {
    name: 'nummeriert (itemNumber1, supplierNumber1)',
    params: { itemNumber1: TESTARTIKEL.werksnummer, supplierNumber1: TESTARTIKEL.hersteller },
  },
  {
    name: 'nur Pietsch-Nummer (itemNumber)',
    params: { itemNumber: TESTARTIKEL.pietschNr },
  },
  {
    name: 'Volltextsuche (query)',
    params: { query: TESTARTIKEL.werksnummer },
  },
];

function zeile(text = ''): void {
  process.stdout.write(`[OXOMI-KALIBRIERUNG] ${text}\n`);
}

function ohneGeheimnis(url: string): string {
  return url.replace(/(accessToken=)[^&]*/gi, '$1***');
}

function baueUrl(basis: string, pfad: string, params: Record<string, string>): string {
  const url = new URL(pfad, basis.endsWith('/') ? basis : `${basis}/`);
  for (const [name, wert] of Object.entries(params)) url.searchParams.set(name, wert);
  return url.toString();
}

const PREISVERDACHT =
  /(preis|netto|brutto|betrag|rabatt|kondition|w(ae|ä)hrung|currency|price|discount|\bEUR\b|€)/i;

function antwortAuszug(koerper: unknown, rohtext: string | undefined): string {
  if (koerper !== undefined) {
    try {
      return JSON.stringify(entfernePreisfelder(koerper)).slice(0, AUSZUG);
    } catch {
      /* faellt auf den Rohtext zurueck */
    }
  }
  if (!rohtext) return '(leer)';
  const kompakt = rohtext.replace(/\s+/g, ' ').trim();
  if (PREISVERDACHT.test(kompakt)) {
    return '(kein JSON, moegliche Preisangaben enthalten - Ausgabe unterdrueckt)';
  }
  return kompakt.slice(0, 400);
}

async function hauptlauf(): Promise<void> {
  if (!existsSync(MARKER)) return;

  zeile(RAHMEN);
  zeile('Start. Marker scripts/KALIBRIERUNG_ANFORDERN liegt vor.');

  const fehlt = fehlendeZugangsdaten();
  if (fehlt.length > 0) {
    zeile(`ABBRUCH: Diese Umgebungsvariablen fehlen in dieser Umgebung: ${fehlt.join(', ')}`);
    zeile('(Namen, keine Werte. Vermutlich sind die Variablen nicht fuer Preview freigegeben.)');
    zeile(RAHMEN);
    return;
  }

  const konfiguration = ladeKonfiguration();
  const drossel = new Drossel(konfiguration.maxParallel, konfiguration.mindestabstandMs);
  const ohneWiederholung = { ...konfiguration, maxWiederholungen: 0 };

  zeile(`Basisadresse: ${konfiguration.basisUrl}`);
  zeile(`Rollen: ${konfiguration.rollen}`);
  zeile('Zugangsdaten sind vollstaendig gesetzt (Werte werden nicht ausgegeben).');
  zeile();

  // --- Teil 1: Welche Ablaufvariante akzeptiert OXOMI? --------------------
  zeile('TEIL 1 - Anmeldung: dieselbe Anfrage mit verschiedenen Ablaufzeitpunkten');
  for (const tagesOffset of [1, 0, 2]) {
    const zugang: Record<string, string> = { ...baueZugangsparameter(konfiguration, Date.now(), tagesOffset) };
    const url = baueUrl(konfiguration.basisUrl, '/service/json/portal/info', zugang);
    const e = await rufeAuf(url, ohneWiederholung, drossel);
    zeile(
      `  Ablauf +${tagesOffset} Tag(e) -> HTTP ${e.httpStatus ?? 'kein Kontakt'} (${e.dauerMs} ms) ${
        e.fehler ?? ''
      }`,
    );
    zeile(`     ${antwortAuszug(e.koerper, e.rohtext)}`);
  }
  zeile();

  // --- Teil 2: Welcher Dienstpfad antwortet? -----------------------------
  const zugang = baueZugangsparameter(konfiguration, Date.now(), 1);

  zeile('TEIL 2 - Dienstpfade, Parameterform "unnummeriert"');
  const vielversprechend: string[] = [];
  for (const kandidat of KALIBRIER_PFADE) {
    const url = baueUrl(konfiguration.basisUrl, kandidat.pfad, {
      ...zugang,
      ...PARAMETERFORMEN[0].params,
    });
    const e = await rufeAuf(url, ohneWiederholung, drossel);
    const gut = e.ok && e.koerper !== undefined;
    if (gut) vielversprechend.push(kandidat.pfad);
    zeile(`  ${gut ? 'JA  ' : 'nein'} ${kandidat.pfad}  HTTP ${e.httpStatus ?? '-'} (${e.dauerMs} ms)`);
    zeile(`       ${ohneGeheimnis(url)}`);
    zeile(`       ${antwortAuszug(e.koerper, e.rohtext)}`);
  }
  zeile();

  // --- Teil 3: Parameterformen am erfolgversprechendsten Pfad ------------
  const zielPfad = vielversprechend[0] ?? '/service/json/product/info';
  zeile(`TEIL 3 - Parameterformen am Pfad ${zielPfad}`);
  for (const form of PARAMETERFORMEN) {
    const url = baueUrl(konfiguration.basisUrl, zielPfad, { ...zugang, ...form.params });
    const e = await rufeAuf(url, ohneWiederholung, drossel);
    zeile(`  ${form.name} -> HTTP ${e.httpStatus ?? '-'} (${e.dauerMs} ms) ${e.fehler ?? ''}`);
    zeile(`     ${antwortAuszug(e.koerper, e.rohtext)}`);
  }

  zeile();
  zeile(`Ergebnis: ${vielversprechend.length} von ${KALIBRIER_PFADE.length} Pfaden haben JSON geliefert.`);
  zeile(RAHMEN);
}

hauptlauf()
  .catch((fehler) => {
    zeile(
      `Unerwarteter Fehler, Build laeuft trotzdem weiter: ${
        fehler instanceof Error ? fehler.message : String(fehler)
      }`,
    );
  })
  .finally(() => {
    process.exit(0);
  });
