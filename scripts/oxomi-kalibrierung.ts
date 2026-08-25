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
 * Er gibt niemals Zugangsdaten aus: Token, Portal-Kennung und technischer
 * Benutzer sind in jeder Adresse ersetzt, das Shared Secret erscheint nirgends,
 * und jede Antwort laeuft vorher durch die Preissperre.
 *
 * Der Lauf bricht den Build nie ab.
 *
 * Ablauf:
 *   Teil 1  Entdeckung - liest die oeffentliche OXOMI-Bibliothek und die
 *           oeffentliche API-Uebersicht und sammelt die dort genannten
 *           Dienstpfade. Damit muss nichts geraten werden.
 *   Teil 2  Anmeldung - probiert die gefundenen Pfade mit beiden Schreibweisen
 *           der Portal-Angabe.
 *   Teil 3  Parameterformen am erfolgreichsten Pfad.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fehlendeZugangsdaten, ladeKonfiguration, loesePortalKennung } from '../lib/oxomi/config.ts';
import { Drossel, rufeAuf } from '../lib/oxomi/http.ts';
import { entfernePreisfelder } from '../lib/oxomi/preissperre.ts';
import { baueZugangsparameter } from '../lib/oxomi/token.ts';

const MARKER = join(process.cwd(), 'scripts', 'KALIBRIERUNG_ANFORDERN');
const RAHMEN = '='.repeat(72);
const AUSZUG = 700;
const MAX_PFADE = 14;

/** Testartikel aus testdaten/artikel/artikel_testliste.csv (Eigenmarke aktiv4YOU). */
const TESTARTIKEL = {
  hersteller: 'hansgrohe',
  werksnummer: '60133450',
  pietschNr: '054107001',
  ean: '4059625478899',
};

/** Oeffentliche Quellen, aus denen die Dienstpfade gelesen werden. */
const QUELLEN = [
  'https://oxomi.com/assets/oxomi.js',
  'https://oxomi.com/system/api',
  'https://oxomi.com/system/api/product',
];

/** Pfade, die auch dann geprueft werden, wenn die Entdeckung nichts findet. */
const RUECKFALL_PFADE = [
  '/service/json/product/info',
  '/service/json/portal/attachments',
  '/service/json/search/products',
];

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
    name: 'nur Werksnummer (itemNumber)',
    params: { itemNumber: TESTARTIKEL.werksnummer },
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

/** Verdeckt Token, Portal-Kennung und Benutzer in einer Adresse. */
function ohneGeheimnis(url: string): string {
  return url
    .replace(/(accessToken=)[^&]*/gi, '$1***')
    .replace(/(portal=)[^&]*/gi, '$1***')
    .replace(/(user=)[^&]*/gi, '$1***');
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
  if (/Seite nicht gefunden|Page not found/i.test(kompakt)) return '(HTML-Fehlerseite "nicht gefunden")';
  if (PREISVERDACHT.test(kompakt)) return '(kein JSON, moegliche Preisangaben - Ausgabe unterdrueckt)';
  return kompakt.slice(0, 300);
}

// ---------------------------------------------------------------------------
// Teil 1: Entdeckung
// ---------------------------------------------------------------------------

async function holeText(url: string): Promise<string | null> {
  try {
    const abbruch = new AbortController();
    const wecker = setTimeout(() => abbruch.abort(), 20_000);
    const antwort = await fetch(url, { signal: abbruch.signal, cache: 'no-store' });
    clearTimeout(wecker);
    if (!antwort.ok) {
      zeile(`  ${url} -> HTTP ${antwort.status}`);
      return null;
    }
    const text = await antwort.text();
    zeile(`  ${url} -> HTTP ${antwort.status}, ${text.length} Zeichen`);
    return text;
  } catch (fehler) {
    zeile(`  ${url} -> ${fehler instanceof Error ? fehler.message : String(fehler)}`);
    return null;
  }
}

/** Sammelt aus einem Text alles, was wie ein Dienstpfad aussieht. */
function findeDienstpfade(text: string): string[] {
  const gefunden = new Set<string>();

  // Pfade in Anfuehrungszeichen, z. B. "/service/json/portal/attachments"
  for (const treffer of text.matchAll(/["'`](\/[A-Za-z0-9][A-Za-z0-9/_.-]{3,80})["'`]/g)) {
    gefunden.add(treffer[1]);
  }
  // Vollstaendige Adressen auf oxomi.com
  for (const treffer of text.matchAll(/https?:\/\/[a-z0-9.-]*oxomi\.com(\/[A-Za-z0-9/_.-]{3,80})/gi)) {
    gefunden.add(treffer[1]);
  }
  // Zusammengesetzte Pfade wie "/service/" + format + "/..."
  for (const treffer of text.matchAll(/["'`](\/service[A-Za-z0-9/_.-]*)["'`]/gi)) {
    gefunden.add(treffer[1]);
  }

  return [...gefunden];
}

function istInteressant(pfad: string): boolean {
  if (/\.(css|png|jpe?g|gif|svg|woff2?|ico|map)$/i.test(pfad)) return false;
  return /(service|api|json)/i.test(pfad);
}

async function entdecke(): Promise<string[]> {
  zeile('TEIL 1 - Entdeckung: oeffentliche OXOMI-Bibliothek und API-Uebersicht lesen');
  const alle = new Set<string>();

  for (const quelle of QUELLEN) {
    const text = await holeText(quelle);
    if (!text) continue;
    for (const pfad of findeDienstpfade(text)) {
      if (istInteressant(pfad)) alle.add(pfad);
    }
  }

  const sortiert = [...alle].sort();
  zeile(`  ${sortiert.length} Kandidaten gefunden:`);
  for (const pfad of sortiert.slice(0, 80)) zeile(`    ${pfad}`);
  if (sortiert.length > 80) zeile(`    ... und ${sortiert.length - 80} weitere`);
  zeile();

  // Fuer die Anmeldeprobe zaehlen nur Pfade unterhalb von /service.
  const dienste = sortiert.filter((p) => p.startsWith('/service'));
  return dienste.length > 0 ? dienste : RUECKFALL_PFADE;
}

// ---------------------------------------------------------------------------

async function hauptlauf(): Promise<void> {
  if (!existsSync(MARKER)) return;

  zeile(RAHMEN);
  zeile('Start. Marker scripts/KALIBRIERUNG_ANFORDERN liegt vor.');

  const fehlt = fehlendeZugangsdaten();
  if (fehlt.length > 0) {
    zeile(`ABBRUCH: Diese Umgebungsvariablen fehlen in dieser Umgebung: ${fehlt.join(', ')}`);
    zeile('(Namen, keine Werte.)');
    zeile(RAHMEN);
    return;
  }

  const konfiguration = ladeKonfiguration();
  const drossel = new Drossel(konfiguration.maxParallel, konfiguration.mindestabstandMs);
  const ohneWiederholung = { ...konfiguration, maxWiederholungen: 0 };

  zeile(`Basisadresse: ${konfiguration.basisUrl}`);
  zeile(`Rollen: ${konfiguration.rollen}`);
  const rohPortal = (process.env.OXOMI_PORTAL ?? '').trim();
  zeile(
    `Portal-Angabe: ${
      rohPortal === loesePortalKennung(rohPortal)
        ? 'reine Kennung'
        : 'vollstaendige Adresse, Kennung wird herausgeloest'
    }`,
  );
  zeile('Zugangsdaten sind vollstaendig gesetzt (Werte werden nicht ausgegeben).');
  zeile();

  const dienstpfade = (await entdecke()).slice(0, MAX_PFADE);

  // --- Teil 2: Anmeldung mit beiden Schreibweisen der Portal-Angabe ------
  const portalFormen: Array<{ name: string; portal: string }> = [
    { name: 'Kennung', portal: loesePortalKennung(rohPortal) },
  ];
  if (rohPortal !== loesePortalKennung(rohPortal)) {
    portalFormen.push({ name: 'vollstaendige Adresse', portal: rohPortal });
  }

  zeile(`TEIL 2 - Anmeldung: ${dienstpfade.length} Dienstpfade x ${portalFormen.length} Portal-Schreibweise(n)`);
  const treffer: Array<{ pfad: string; portalForm: string }> = [];

  for (const form of portalFormen) {
    const zugang: Record<string, string> = {
      ...baueZugangsparameter({ ...konfiguration, portal: form.portal }, Date.now(), 1),
    };
    zeile(`  Portal-Schreibweise: ${form.name}`);
    for (const pfad of dienstpfade) {
      const url = baueUrl(konfiguration.basisUrl, pfad, { ...zugang, ...PARAMETERFORMEN[0].params });
      const e = await rufeAuf(url, ohneWiederholung, drossel);
      const gut = e.ok && e.koerper !== undefined;
      if (gut) treffer.push({ pfad, portalForm: form.name });
      zeile(`    ${gut ? 'JA  ' : 'nein'} ${pfad}  HTTP ${e.httpStatus ?? '-'} (${e.dauerMs} ms)`);
      zeile(`         ${antwortAuszug(e.koerper, e.rohtext)}`);
    }
    zeile();
  }

  // --- Teil 3: Parameterformen am erfolgreichsten Pfad -------------------
  if (treffer.length === 0) {
    zeile('TEIL 3 entfaellt: kein Dienstpfad hat JSON geliefert.');
    zeile(RAHMEN);
    return;
  }

  const ziel = treffer[0];
  const zielPortal =
    ziel.portalForm === 'Kennung' ? loesePortalKennung(rohPortal) : rohPortal;
  const zugang: Record<string, string> = {
    ...baueZugangsparameter({ ...konfiguration, portal: zielPortal }, Date.now(), 1),
  };

  zeile(`TEIL 3 - Parameterformen am Pfad ${ziel.pfad} (Portal als ${ziel.portalForm})`);
  for (const form of PARAMETERFORMEN) {
    const url = baueUrl(konfiguration.basisUrl, ziel.pfad, { ...zugang, ...form.params });
    const e = await rufeAuf(url, ohneWiederholung, drossel);
    zeile(`  ${form.name} -> HTTP ${e.httpStatus ?? '-'} (${e.dauerMs} ms) ${e.fehler ?? ''}`);
    zeile(`     ${ohneGeheimnis(url)}`);
    zeile(`     ${antwortAuszug(e.koerper, e.rohtext)}`);
  }

  zeile();
  zeile(`Ergebnis: ${treffer.length} Treffer. Erster: ${ziel.pfad} (Portal als ${ziel.portalForm}).`);
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
