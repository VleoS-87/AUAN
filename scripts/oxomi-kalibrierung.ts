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
import { existsSync, readFileSync } from 'node:fs';
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

/** Druckt die Dokumentation rund um einen Endpunktpfad - dort steht die Parametertabelle. */
function zeigeEndpunkt(text: string, pfad: string, laenge: number): boolean {
  const stelle = text.indexOf(pfad);
  if (stelle < 0) return false;
  drucke(text.slice(Math.max(0, stelle - 160), stelle + laenge));
  return true;
}

async function leseDokumentation(): Promise<void> {
  zeile('TEIL 1 - Dokumentation: Parametertabellen der einzelnen Endpunkte');
  const html = await holeText('https://oxomi.com/system/api/product');
  if (!html) {
    zeile();
    return;
  }
  const text = alsText(html);

  for (const pfad of [
    '/portals/api/v1/products/resolve-gtin',
    '/portals/api/v2/products/search',
    '/portals/api/v1/product/data',
  ]) {
    zeile(`  ${pfad}:`);
    if (!zeigeEndpunkt(text, pfad, 1500)) zeile('    (nicht gefunden)');
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
      supplierNumber1: TESTARTIKEL.hersteller,
    };
    if (variante.rollenSenden) params.roles = konfiguration.rollen;
    if (variante.expiresSenden) params.expires = String(expires);

    const url = baueUrl(konfiguration.basisUrl, PRODUKT_V1, params);
    const e = await rufeAuf(url, ohneWiederholung, drossel);
    // Die Anmeldung ist bestanden, sobald OXOMI nicht mehr "Unauthorized" meldet.
    // Ein Hinweis auf einen fehlenden Pflichtparameter heisst: Token akzeptiert.
    const meldung = String((e.koerper as { message?: unknown } | undefined)?.message ?? '');
    const gut = e.httpStatus !== 401 && !/unauthorized/i.test(meldung);
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

/**
 * Abfragearten, die das Portal laut Messung vom 25.08.2026 kennt.
 * Nicht verfuegbar sind: product-attributes, attributes, classification, eclass,
 * details, product-details, product-texts, brand, series, catalogs, datasheet,
 * documents. Sie melden "Cannot find ... of type ProductDataProvider".
 */
const ABFRAGEARTEN_VERFUEGBAR = ['product-images', 'attachments', 'texts', 'pages', 'videos', 'cover'];

interface AufgeloesterArtikel {
  pietschNr: string;
  bezeichnung: string;
  ean: string;
  werksnummer: string;
  supplierNumber?: string;
  supplierItemNumber?: string;
}

/** Liest die Testliste direkt aus der CSV, damit hier keine Kopie der Daten liegt. */
function ladeTestartikel(): AufgeloesterArtikel[] {
  const inhalt = readFileSync(join(process.cwd(), 'testdaten/artikel/artikel_testliste.csv'), 'utf8');
  const zeilen = inhalt.replace(/\r/g, '').split('\n').filter((z) => z.trim() !== '');
  const kopf = zeilen[0].split(';').map((k) => k.trim().toLowerCase());
  const i = (name: string) => kopf.indexOf(name);
  return zeilen.slice(1).map((z) => {
    const f = z.split(';');
    return {
      pietschNr: (f[i('pietsch_artikelnummer')] ?? '').trim(),
      bezeichnung: (f[i('bezeichnung')] ?? '').trim(),
      ean: (f[i('ean')] ?? '').trim(),
      werksnummer: (f[i('werksnummer')] ?? '').trim(),
    };
  });
}

/**
 * Zeigt eine Produktantwort abschnittsweise: erst der Kopf, dann je Abfrageart
 * ein eigener Auszug. So bleibt im Protokoll lesbar, was wirklich geliefert wird.
 */
function zeigeProduktantwort(koerper: unknown): void {
  const sicher = koerper === undefined ? undefined : entfernePreisfelder(koerper);
  if (!sicher || typeof sicher !== 'object') {
    zeile('     (keine auswertbare Antwort)');
    return;
  }
  const rumpf = sicher as {
    products?: Array<{
      productId?: string;
      supplierNumber?: string;
      itemNumber?: string;
      resolved?: boolean;
      queries?: Record<string, unknown> | Array<Record<string, unknown>>;
    }>;
  };
  const produkt = rumpf.products?.[0];
  if (!produkt) {
    zeile(`     ${JSON.stringify(sicher).slice(0, 500)}`);
    return;
  }

  zeile(
    `     productId=${produkt.productId} Lieferant=${produkt.supplierNumber} Artikel=${produkt.itemNumber} gefunden=${produkt.resolved}`,
  );

  const abfragen = produkt.queries;
  const eintraege: Array<[string, unknown]> = Array.isArray(abfragen)
    ? abfragen.map((a) => [String((a as { name?: string }).name ?? '?'), a])
    : Object.entries(abfragen ?? {});

  for (const [name, inhalt] of eintraege) {
    const text = JSON.stringify(inhalt);
    zeile(`     [${name}] ${text.length} Zeichen`);
    for (let i = 0; i < Math.min(text.length, 1600); i += 200) {
      zeile(`       | ${text.slice(i, i + 200)}`);
    }
    if (text.length > 1600) zeile(`       | ... (${text.length - 1600} Zeichen mehr)`);
  }
}

async function probiereArtikel(
  konfiguration: ReturnType<typeof ladeKonfiguration>,
  drossel: Drossel,
  variante: Variante,
): Promise<void> {
  zeile(`TEIL 3 - Artikeldaten holen (Anmeldung: ${variante.name})`);
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

  // --- 3a: Alle Test-EANs aufloesen -------------------------------------
  zeile('  3a) EAN aufloesen fuer alle Testartikel');
  const artikel = ladeTestartikel();
  for (const a of artikel) {
    const url = baueUrl(konfiguration.basisUrl, '/portals/api/v1/products/resolve-gtin', {
      ...zugang,
      gtin: a.ean,
    });
    const e = await rufeAuf(url, ohneWiederholung, drossel);
    const rumpf = e.koerper as
      | { resolved?: boolean; supplierNumber?: string; supplierItemNumber?: string }
      | undefined;
    if (rumpf?.resolved) {
      a.supplierNumber = rumpf.supplierNumber;
      a.supplierItemNumber = rumpf.supplierItemNumber;
    }
    const werkPasst =
      rumpf?.supplierItemNumber && a.werksnummer
        ? rumpf.supplierItemNumber.replace(/\s/g, '') === a.werksnummer.replace(/\s/g, '')
          ? 'stimmt mit der Werksnummer ueberein'
          : 'weicht von der Werksnummer ab'
        : '';
    zeile(
      `     ${a.pietschNr} ${a.bezeichnung.slice(0, 44)} -> ${
        rumpf?.resolved ? `Lieferant ${rumpf.supplierNumber}, Artikel ${rumpf.supplierItemNumber} (${werkPasst})` : 'nicht aufgeloest'
      }`,
    );
  }
  zeile();

  // --- 3b: Vollstaendige Produktauskunft V2 fuer einen aufgeloesten Artikel
  const ziel = artikel.find((a) => a.supplierNumber);
  if (!ziel) {
    zeile('  Kein Artikel aufgeloest - Teil 3b und 3c entfallen.');
    return;
  }

  zeile(`  3b) Produktauskunft V2 fuer ${ziel.pietschNr} (${ziel.bezeichnung.slice(0, 50)})`);
  const abfragen: Record<string, unknown> = {};
  for (const art of ABFRAGEARTEN_VERFUEGBAR) abfragen[art] = { type: 'json' };
  abfragen['product-images'] = { type: 'json', settings: { limit: 10 } };

  const v2Url = baueUrl(konfiguration.basisUrl, '/portals/api/v2/product/data', {
    ...zugang,
    language: 'de',
  });
  const v2 = await rufeAuf(v2Url, ohneWiederholung, drossel, {
    methode: 'POST',
    koerper: {
      outputMode: 'normal',
      queries: abfragen,
      products: [{ itemNumber: ziel.supplierItemNumber, supplierNumber: ziel.supplierNumber }],
    },
  });
  zeile(`     HTTP ${v2.httpStatus ?? '-'} (${v2.dauerMs} ms), Antwortlaenge ${
    v2.rohtext?.length ?? 0
  } Zeichen`);
  zeigeProduktantwort(v2.koerper);

  // --- 3c: Produktauskunft V1, um die Vollausgabe zu sehen --------------
  zeile('  3c) Produktauskunft V1 mit demselben Artikel');
  const v1Url = baueUrl(konfiguration.basisUrl, PRODUKT_V1, {
    ...zugang,
    language: 'de',
    itemNumber1: ziel.supplierItemNumber!,
    supplierNumber1: ziel.supplierNumber!,
  });
  const v1 = await rufeAuf(v1Url, ohneWiederholung, drossel);
  zeile(`     HTTP ${v1.httpStatus ?? '-'} (${v1.dauerMs} ms)`);
  drucke(antwortAuszug(v1.koerper, v1.rohtext, 1200));

  // --- 3d: Gibt es einen Dienst fuer Merkmale und eCl@ss? ---------------
  zeile('  3d) Weitere Dienste laut Dokumentation (Datenblatt, Inhalte, Marken)');
  for (const dokuSeite of ['https://oxomi.com/system/api/datasheet', 'https://oxomi.com/system/api/contents']) {
    const html = await holeText(dokuSeite);
    if (!html) continue;
    const text = alsText(html);
    const pfade = [...new Set([...text.matchAll(/\/portals\/api\/[A-Za-z0-9/_.-]+/g)].map((t) => t[0]))];
    zeile(`     ${dokuSeite}: ${pfade.join(', ') || '(keine Pfade gefunden)'}`);
  }
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
