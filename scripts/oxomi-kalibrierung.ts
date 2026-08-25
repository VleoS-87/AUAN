/**
 * Kalibrierlauf im Build.
 *
 * Warum im Build und nicht ueber die Testroute: Die Testroute ist mit
 * APP_SECRET geschuetzt, und der Schluessel liegt bewusst nur beim
 * Auftraggeber. Der Kalibrierlauf braucht aber echte OXOMI-Antworten, um die
 * Schnittstelle zu bestimmen. Deshalb laeuft er im Vercel-Build, wo die
 * Zugangsdaten ohnehin liegen, und schreibt sein Ergebnis ins Build-Protokoll.
 *
 * Er laeuft NUR, wenn die Marker-Datei scripts/KALIBRIERUNG_ANFORDERN im Repo
 * liegt. Ohne Marker beendet er sich sofort, ohne eine einzige Anfrage.
 *
 * Er gibt niemals Zugangsdaten aus: Token, Portal-Kennung und technischer
 * Benutzer sind in jeder Adresse ersetzt, das Shared Secret erscheint nirgends,
 * und jede Antwort laeuft vorher durch die Preissperre.
 *
 * Der Lauf bricht den Build nie ab.
 *
 * Bisher gemessen (25.08.2026):
 *   - Die Dienstpfade heissen /portals/api/v1|v2/..., nicht /service/json/...
 *   - Die Portal-Kennung muss aus der hinterlegten Portaladresse geloest werden.
 *     Mit Kennung antwortet OXOMI 401 (Anmeldung), mit voller Adresse 400
 *     ("Unknown Portal") - die Kennung ist also richtig erkannt.
 *   - Offen: die genaue Token-Bildung. Darum geht es in diesem Lauf.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fehlendeZugangsdaten, ladeKonfiguration, loesePortalKennung } from '../lib/oxomi/config.ts';
import { Drossel, rufeAuf } from '../lib/oxomi/http.ts';
import { entfernePreisfelder } from '../lib/oxomi/preissperre.ts';
import { berechneAccessToken, berechneExpires } from '../lib/oxomi/token.ts';

const MARKER = join(process.cwd(), 'scripts', 'KALIBRIERUNG_ANFORDERN');
const RAHMEN = '='.repeat(72);
const AUSZUG = 700;

/** Testartikel aus testdaten/artikel/artikel_testliste.csv (Eigenmarke aktiv4YOU). */
const TESTARTIKEL = {
  hersteller: 'hansgrohe',
  werksnummer: '60133450',
  pietschNr: '054107001',
  ean: '4059625478899',
};

const PRODUKT_V1 = '/portals/api/v1/product/data';

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

function antwortAuszug(koerper: unknown, rohtext: string | undefined, laenge = AUSZUG): string {
  if (koerper !== undefined) {
    try {
      return JSON.stringify(entfernePreisfelder(koerper)).slice(0, laenge);
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
// Teil 1: Dokumentation lesen
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

function alsText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function drucke(text: string): void {
  for (let i = 0; i < text.length; i += 200) zeile(`    | ${text.slice(i, i + 200)}`);
  zeile('    | ---');
}

/** Druckt den Abschnitt, der auf eine Marke folgt. */
function zeigeAbschnitt(html: string, marke: RegExp, laenge: number): boolean {
  const text = alsText(html);
  const treffer = text.match(marke);
  if (!treffer || treffer.index === undefined) return false;
  drucke(text.slice(treffer.index, treffer.index + laenge));
  return true;
}

async function leseDokumentation(): Promise<void> {
  zeile('TEIL 1 - Dokumentation lesen (Suche nach den Abfragearten der Produktauskunft)');
  const produkt = await holeText('https://oxomi.com/system/api/product');
  if (produkt) {
    if (!zeigeAbschnitt(produkt, /Resolve GTIN to Product/i, 2200)) {
      zeile('    (Abschnitt Resolve-GTIN nicht gefunden)');
    }
    if (!zeigeAbschnitt(produkt, /Search Products via Query Text/i, 2200)) {
      zeile('    (Abschnitt Produktsuche nicht gefunden)');
    }
  }
  zeile();
}

// ---------------------------------------------------------------------------
// Teil 2: Anmeldevarianten durchprobieren
// ---------------------------------------------------------------------------

interface Variante {
  name: string;
  tagesOffset: number;
  rollenSenden: boolean;
  expiresSenden: boolean;
}

function baueVarianten(): Variante[] {
  const varianten: Variante[] = [];
  for (const tagesOffset of [0, 1, -1]) {
    for (const rollenSenden of [true, false]) {
      for (const expiresSenden of [false, true]) {
        varianten.push({
          name: `Tagesnummer ${tagesOffset >= 0 ? '+' : ''}${tagesOffset}, Rollen ${
            rollenSenden ? 'gesendet' : 'weggelassen'
          }, expires ${expiresSenden ? 'gesendet' : 'weggelassen'}`,
          tagesOffset,
          rollenSenden,
          expiresSenden,
        });
      }
    }
  }
  return varianten;
}

async function probiereAnmeldung(
  konfiguration: ReturnType<typeof ladeKonfiguration>,
  drossel: Drossel,
): Promise<Variante | null> {
  zeile('TEIL 2 - Anmeldung: Varianten der Token-Bildung');
  const ohneWiederholung = { ...konfiguration, maxWiederholungen: 0 };
  let erfolg: Variante | null = null;

  for (const variante of baueVarianten()) {
    const expires = berechneExpires(Date.now(), variante.tagesOffset);
    const rollen = variante.rollenSenden ? konfiguration.rollen : '';
    const accessToken = berechneAccessToken({
      secret: konfiguration.secret,
      portal: konfiguration.portal,
      user: konfiguration.user,
      expires,
      rollen,
    });

    const params: Record<string, string> = {
      portal: konfiguration.portal,
      user: konfiguration.user,
      accessToken,
      itemNumber1: TESTARTIKEL.werksnummer,
    };
    if (variante.rollenSenden) params.roles = konfiguration.rollen;
    if (variante.expiresSenden) params.expires = String(expires);

    const url = baueUrl(konfiguration.basisUrl, PRODUKT_V1, params);
    const e = await rufeAuf(url, ohneWiederholung, drossel);
    const gut =
      e.httpStatus === 200 &&
      (e.koerper as { success?: boolean } | undefined)?.success !== false;
    if (gut && !erfolg) erfolg = variante;

    zeile(`  ${gut ? 'JA  ' : 'nein'} ${variante.name} -> HTTP ${e.httpStatus ?? '-'} (${e.dauerMs} ms)`);
    zeile(`       ${antwortAuszug(e.koerper, e.rohtext, 300)}`);
  }

  zeile();
  return erfolg;
}

// ---------------------------------------------------------------------------
// Teil 3: Artikel wirklich abfragen
// ---------------------------------------------------------------------------

/** Abfragearten, die die Produktauskunft V2 kennen koennte. Wird gemessen. */
const ABFRAGEARTEN = [
  'product-images',
  'attachments',
  'cover',
  'datasheet',
  'documents',
  'videos',
  'catalogs',
  'pages',
  'product-attributes',
  'attributes',
  'classification',
  'eclass',
  'product-details',
  'details',
  'texts',
  'product-texts',
  'brand',
  'series',
];

async function probiereArtikel(
  konfiguration: ReturnType<typeof ladeKonfiguration>,
  drossel: Drossel,
  variante: Variante,
): Promise<void> {
  zeile(`TEIL 3 - Artikelabfrage mit der funktionierenden Anmeldung (${variante.name})`);
  const ohneWiederholung = { ...konfiguration, maxWiederholungen: 0 };

  const expires = berechneExpires(Date.now(), variante.tagesOffset);
  const rollen = variante.rollenSenden ? konfiguration.rollen : '';
  const accessToken = berechneAccessToken({
    secret: konfiguration.secret,
    portal: konfiguration.portal,
    user: konfiguration.user,
    expires,
    rollen,
  });
  const zugang: Record<string, string> = {
    portal: konfiguration.portal,
    user: konfiguration.user,
    accessToken,
  };
  if (variante.rollenSenden) zugang.roles = konfiguration.rollen;

  // --- 3a: Welche Abfragearten kennt das Portal? -------------------------
  zeile('  3a) Abfragearten der Produktauskunft V2 messen');
  const abfragen: Record<string, unknown> = {};
  for (const art of ABFRAGEARTEN) abfragen[art] = { type: 'json' };

  const v2Url = baueUrl(konfiguration.basisUrl, '/portals/api/v2/product/data', zugang);
  const v2Antwort = await rufeAuf(v2Url, ohneWiederholung, drossel, {
    methode: 'POST',
    koerper: {
      outputMode: 'normal',
      queries: abfragen,
      products: [{ itemNumber: TESTARTIKEL.werksnummer }],
    },
  });
  zeile(`     HTTP ${v2Antwort.httpStatus ?? '-'} (${v2Antwort.dauerMs} ms)`);
  zeile(`     ${antwortAuszug(v2Antwort.koerper, v2Antwort.rohtext, 2600)}`);

  // --- 3b: Welche Kennung findet den Artikel? ---------------------------
  zeile('  3b) Welche Kennung findet den Artikel?');
  const kennungen: Array<{ name: string; produkt: Record<string, string> }> = [
    { name: 'Werksnummer', produkt: { itemNumber: TESTARTIKEL.werksnummer } },
    {
      name: 'Werksnummer + Hersteller',
      produkt: { itemNumber: TESTARTIKEL.werksnummer, supplierNumber: TESTARTIKEL.hersteller },
    },
    { name: 'Pietsch-Nummer', produkt: { itemNumber: TESTARTIKEL.pietschNr } },
    { name: 'EAN', produkt: { itemNumber: TESTARTIKEL.ean } },
  ];

  for (const kennung of kennungen) {
    const e = await rufeAuf(v2Url, ohneWiederholung, drossel, {
      methode: 'POST',
      koerper: {
        outputMode: 'normal',
        queries: { 'product-images': { type: 'json', settings: { limit: 3 } } },
        products: [kennung.produkt],
      },
    });
    zeile(`     ${kennung.name} -> HTTP ${e.httpStatus ?? '-'} (${e.dauerMs} ms)`);
    zeile(`        ${antwortAuszug(e.koerper, e.rohtext, 900)}`);
  }

  // --- 3c: EAN aufloesen und Volltextsuche ------------------------------
  zeile('  3c) EAN aufloesen und Volltextsuche');
  const gtinVersuche: Array<{ name: string; pfad: string; params: Record<string, string> }> = [
    { name: 'resolve-gtin (gtin)', pfad: '/portals/api/v1/products/resolve-gtin', params: { gtin: TESTARTIKEL.ean } },
    { name: 'resolve-gtin (gtin1)', pfad: '/portals/api/v1/products/resolve-gtin', params: { gtin1: TESTARTIKEL.ean } },
    { name: 'resolve-gtin (number)', pfad: '/portals/api/v1/products/resolve-gtin', params: { number: TESTARTIKEL.ean } },
  ];
  for (const versuch of gtinVersuche) {
    const url = baueUrl(konfiguration.basisUrl, versuch.pfad, { ...zugang, ...versuch.params });
    const e = await rufeAuf(url, ohneWiederholung, drossel);
    zeile(`     ${versuch.name} -> HTTP ${e.httpStatus ?? '-'} (${e.dauerMs} ms)`);
    zeile(`        ${ohneGeheimnis(url)}`);
    zeile(`        ${antwortAuszug(e.koerper, e.rohtext, 700)}`);
  }

  const sucheUrl = baueUrl(konfiguration.basisUrl, '/portals/api/v2/products/search', zugang);
  const suche = await rufeAuf(sucheUrl, ohneWiederholung, drossel, {
    methode: 'POST',
    koerper: { query: TESTARTIKEL.werksnummer },
  });
  zeile(`     Volltextsuche (POST query) -> HTTP ${suche.httpStatus ?? '-'} (${suche.dauerMs} ms)`);
  zeile(`        ${antwortAuszug(suche.koerper, suche.rohtext, 900)}`);
  zeile();
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
  zeile();

  await leseDokumentation();
  const variante = await probiereAnmeldung(konfiguration, drossel);

  if (!variante) {
    zeile('TEIL 3 entfaellt: keine Anmeldevariante wurde angenommen.');
    zeile(RAHMEN);
    return;
  }

  await probiereArtikel(konfiguration, drossel, variante);
  zeile(`Ergebnis: Anmeldung funktioniert mit "${variante.name}".`);
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
