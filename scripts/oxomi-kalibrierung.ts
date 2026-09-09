/**
 * Kalibrierlauf im Build.
 *
 * Werkzeug, um die OXOMI-Schnittstelle gegen das echte Portal zu vermessen,
 * statt sie zu vermuten. Laeuft NUR, solange die Marker-Datei
 * scripts/KALIBRIERUNG_ANFORDERN im Repo liegt. Ohne Marker keine einzige
 * Anfrage nach aussen.
 *
 * Gibt niemals Zugangsdaten aus: Token, Portal-Kennung und technischer Benutzer
 * sind in jeder Adresse ersetzt, das Shared Secret erscheint nirgends, und jede
 * Antwort laeuft vorher durch die Preissperre. Bricht den Build nie ab.
 *
 * Bereits gemessen (25.08.2026), festgehalten in docs/OXOMI_SCHNITTSTELLE.md:
 *   - Dienstpfade /portals/api/v1|v2/..., Anmeldung ueber die Tagesnummer
 *   - EAN aufloesen liefert Lieferanten- und Artikelnummer
 *   - Verfuegbare Abfragen: product-images, texts, attachments, pages, videos, cover
 *   - Nicht verfuegbar: eclass, classification, attributes, ...
 *
 * AKTUELLE FRAGE: Gibt es eine ETIM-Klassifikation? ETIM ist im SHK-Bereich die
 * verbreitetere Klassifikation und liefert - anders als eine reine Warengruppe -
 * strukturierte Merkmale mit Werten. Das waere fuer die Faktenzeile der Mappe
 * die sauberere Quelle als das Auslesen aus Beschreibungstexten.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fehlendeZugangsdaten, ladeKonfiguration } from '../lib/oxomi/config.ts';
import { Drossel, rufeAuf } from '../lib/oxomi/http.ts';
import { entfernePreisfelder } from '../lib/oxomi/preissperre.ts';
import { baueUrl, loeseGtinAuf, ohneGeheimnis } from '../lib/oxomi/client.ts';
import { baueZugangsparameter } from '../lib/oxomi/token.ts';
import { PRODUKTDATEN_V2 } from '../lib/oxomi/endpunkte.ts';

const MARKER = join(process.cwd(), 'scripts', 'KALIBRIERUNG_ANFORDERN');
const RAHMEN = '='.repeat(72);

/**
 * Kandidaten fuer eine Abfrageart, die Klassifikation oder strukturierte
 * Merkmale liefern koennte. Wird gegen das Portal gemessen; was es nicht kennt,
 * meldet es als Fehler zurueck.
 */
const MERKMALS_KANDIDATEN = [
  // ETIM in allen Schreibweisen, die in Erwaegung kommen
  'etim',
  'etim-features',
  'etim-class',
  'etim-classification',
  'etim-data',
  'product-etim',
  'classification-etim',
  // Schreibweisen aus der OXOMI-Hilfeseite "Merkmale fuer Artikel"
  'item-features',
  'itemfeatures',
  'item-attributes',
  'item-data',
  'metaclass',
  // allgemeine Merkmalsbegriffe
  'features',
  'product-features',
  'feature-values',
  'characteristics',
  'product-characteristics',
  'merkmale',
  'properties',
  'product-properties',
  'specifications',
  'technical-data',
  'technical-details',
  'technische-daten',
  // Klassifikation allgemein
  'classifications',
  'product-classification',
  'class',
  'category',
  'categories',
  'product-category',
  'warengruppe',
  // Datenblatt und Stammdaten
  'datasheet-data',
  'product-data',
  'masterdata',
  'basedata',
  'product-info',
  'info',
  // bereits als verfuegbar bekannt - als Gegenprobe, dass der Lauf misst
  'texts',
];

const AUSGABEFORMEN = ['normal', 'full', 'extended', 'all', 'complete'];

function zeile(text = ''): void {
  process.stdout.write(`[OXOMI-KALIBRIERUNG] ${text}\n`);
}

function drucke(text: string, breite = 200): void {
  for (let i = 0; i < text.length; i += breite) zeile(`    | ${text.slice(i, i + breite)}`);
  zeile('    | ---');
}

function auszug(koerper: unknown, laenge: number): string {
  if (koerper === undefined) return '(kein JSON)';
  try {
    return JSON.stringify(entfernePreisfelder(koerper)).slice(0, laenge);
  } catch {
    return '(nicht darstellbar)';
  }
}

// ---------------------------------------------------------------------------
// Teil 1: Dokumentation nach ETIM durchsuchen
// ---------------------------------------------------------------------------

const DOKU_SEITEN = [
  // Hilfeseite "Merkmale fuer Artikel" - beschreibt die Merkmalsfunktion direkt
  'https://oxomi.com/help/de/integration/beispiele/function-item-features',
  'https://oxomi.com/system/api',
  'https://oxomi.com/system/api/product',
  'https://oxomi.com/system/api/product-sync',
  'https://oxomi.com/system/api/contents',
  'https://oxomi.com/system/api/datasheet',
  'https://oxomi.com/system/api/brands',
];

const SUCHWORTE = /(etim|feature|klassifik|classific|merkmal|attribut)/i;

async function holeText(url: string): Promise<string | null> {
  try {
    const abbruch = new AbortController();
    const wecker = setTimeout(() => abbruch.abort(), 20_000);
    const antwort = await fetch(url, { signal: abbruch.signal, cache: 'no-store' });
    clearTimeout(wecker);
    if (!antwort.ok) return null;
    return await antwort.text();
  } catch {
    return null;
  }
}

function alsText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function durchsucheDokumentation(): Promise<void> {
  zeile('TEIL 1 - Dokumentation nach ETIM und Merkmalen durchsuchen');

  for (const seite of DOKU_SEITEN) {
    const html = await holeText(seite);
    if (!html) {
      zeile(`  ${seite} -> nicht abrufbar`);
      continue;
    }
    const text = alsText(html);
    const treffer: string[] = [];
    let ab = 0;
    while (treffer.length < 4) {
      const rest = text.slice(ab);
      const fund = rest.match(SUCHWORTE);
      if (!fund || fund.index === undefined) break;
      const stelle = ab + fund.index;
      treffer.push(text.slice(Math.max(0, stelle - 140), stelle + 260));
      ab = stelle + 60;
    }
    zeile(`  ${seite} -> ${treffer.length > 0 ? `${treffer.length} Fundstellen` : 'keine Fundstelle'}`);
    for (const stelle of treffer) drucke(stelle);
  }
  zeile();
}

// ---------------------------------------------------------------------------
// Teil 2 und 3: gegen das echte Portal messen
// ---------------------------------------------------------------------------

/** Testartikel aus testdaten/artikel/artikel_testliste.csv. */
function ladeTestEans(): Array<{ nr: string; bezeichnung: string; ean: string }> {
  const inhalt = readFileSync(join(process.cwd(), 'testdaten/artikel/artikel_testliste.csv'), 'utf8');
  const zeilen = inhalt.replace(/\r/g, '').split('\n').filter((z) => z.trim() !== '');
  const kopf = zeilen[0].split(';').map((k) => k.trim().toLowerCase());
  const i = (name: string) => kopf.indexOf(name);
  return zeilen.slice(1).map((z) => {
    const f = z.split(';');
    return {
      nr: (f[i('pietsch_artikelnummer')] ?? '').trim(),
      bezeichnung: (f[i('bezeichnung')] ?? '').trim(),
      ean: (f[i('ean')] ?? '').trim(),
    };
  });
}

async function hauptlauf(): Promise<void> {
  if (!existsSync(MARKER)) return;

  zeile(RAHMEN);
  zeile('Start. Frage dieses Laufs: Gibt es ETIM-Merkmale im Portal?');

  await durchsucheDokumentation();

  const fehlt = fehlendeZugangsdaten();
  if (fehlt.length > 0) {
    zeile(`ABBRUCH: Zugangsdaten unvollstaendig (${fehlt.join(', ')}).`);
    zeile(RAHMEN);
    return;
  }

  const konfiguration = ladeKonfiguration();
  const drossel = new Drossel(konfiguration.maxParallel, konfiguration.mindestabstandMs);
  const ohneWiederholung = { ...konfiguration, maxWiederholungen: 0 };

  // --- Artikel aufloesen -------------------------------------------------
  const artikel = ladeTestEans();
  const aufgeloest: Array<{ nr: string; bezeichnung: string; lieferant: string; artikelnr: string }> = [];
  for (const a of artikel) {
    const e = await loeseGtinAuf(a.ean, { konfiguration, drossel });
    if (e.kennung) {
      aufgeloest.push({
        nr: a.nr,
        bezeichnung: a.bezeichnung,
        lieferant: e.kennung.supplierNumber,
        artikelnr: e.kennung.supplierItemNumber,
      });
    }
  }
  zeile(`${aufgeloest.length} von ${artikel.length} Testartikeln aufgeloest.`);
  if (aufgeloest.length === 0) {
    zeile('ABBRUCH: kein Artikel aufgeloest.');
    zeile(RAHMEN);
    return;
  }
  zeile();

  const zugang: Record<string, string> = {
    ...baueZugangsparameter(konfiguration),
  };
  const url = baueUrl(konfiguration.basisUrl, PRODUKTDATEN_V2, { ...zugang, language: 'de' });
  const ziel = aufgeloest[0];

  // --- Teil 2: Welche Abfragearten kennt das Portal? --------------------
  zeile(`TEIL 2 - ${MERKMALS_KANDIDATEN.length} Abfragearten gegen ${ziel.nr} messen`);
  zeile(`  ${ohneGeheimnis(url)}`);

  const abfragen: Record<string, unknown> = {};
  for (const name of MERKMALS_KANDIDATEN) abfragen[name] = { type: 'json' };

  const antwort = await rufeAuf(url, ohneWiederholung, drossel, {
    methode: 'POST',
    koerper: {
      outputMode: 'normal',
      queries: abfragen,
      products: [{ itemNumber: ziel.artikelnr, supplierNumber: ziel.lieferant }],
    },
  });

  const rumpf = entfernePreisfelder(antwort.koerper) as
    | { products?: Array<{ queries?: Record<string, { error?: boolean; message?: string }> }> }
    | undefined;
  const ergebnisse = rumpf?.products?.[0]?.queries ?? {};

  const verfuegbar: string[] = [];
  for (const name of MERKMALS_KANDIDATEN) {
    const e = ergebnisse[name];
    if (!e) {
      zeile(`  ?    ${name} - keine Antwort`);
    } else if (e.error) {
      zeile(`  nein ${name}`);
    } else {
      verfuegbar.push(name);
      zeile(`  JA   ${name}`);
      drucke(JSON.stringify(entfernePreisfelder(e)).slice(0, 2400));
    }
  }
  zeile();
  zeile(`  Verfuegbar: ${verfuegbar.join(', ') || 'keine der gepruefen Arten'}`);
  zeile();

  // --- Teil 3: Andere Ausgabeformen -------------------------------------
  zeile('TEIL 3 - Ausgabeformen (outputMode) mit den bekannten Abfragen');
  for (const form of AUSGABEFORMEN) {
    const e = await rufeAuf(url, ohneWiederholung, drossel, {
      methode: 'POST',
      koerper: {
        outputMode: form,
        queries: { texts: { type: 'json' } },
        products: [{ itemNumber: ziel.artikelnr, supplierNumber: ziel.lieferant }],
      },
    });
    const laenge = e.rohtext?.length ?? 0;
    zeile(`  outputMode "${form}" -> HTTP ${e.httpStatus ?? '-'}, Antwortlaenge ${laenge}`);
    if (e.httpStatus !== 200) zeile(`     ${auszug(e.koerper, 240)}`);
  }
  zeile();

  // --- Teil 4: Welche Textarten gibt es? --------------------------------
  zeile('TEIL 4 - Welche Textarten liefert das Portal je Artikel?');
  for (const a of aufgeloest) {
    const e = await rufeAuf(url, ohneWiederholung, drossel, {
      methode: 'POST',
      koerper: {
        outputMode: 'normal',
        queries: { texts: { type: 'json' } },
        products: [{ itemNumber: a.artikelnr, supplierNumber: a.lieferant }],
      },
    });
    const r = entfernePreisfelder(e.koerper) as
      | { products?: Array<{ queries?: { texts?: { texts?: Array<{ type?: string; typeName?: string }> } } }> }
      | undefined;
    const texte = r?.products?.[0]?.queries?.texts?.texts ?? [];
    zeile(
      `  ${a.nr} ${a.bezeichnung.slice(0, 40)}: ${
        texte.map((t) => `${t.type}(${t.typeName})`).join(', ') || 'keine Texte'
      }`,
    );
  }

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
