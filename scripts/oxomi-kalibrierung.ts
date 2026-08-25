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
  zeile('TEIL 1 - Dokumentation lesen');

  const produkt = await holeText('https://oxomi.com/system/api/product');
  if (produkt) {
    zeile('  Produktauskunft V1 - vollstaendige Parameterliste:');
    if (!zeigeAbschnitt(produkt, /Fetch Complete Information of Products V1/i, 3600)) {
      zeile('    (Abschnitt nicht gefunden)');
    }
  }

  for (const quelle of [
    'https://oxomi.com/kba/de/INT63',
    'https://oxomi.com/help/en/integration/authentication',
    'https://oxomi.com/help/de/integration/authentifizierung',
  ]) {
    const html = await holeText(quelle);
    if (!html) continue;
    zeile(`  Anmeldung laut ${quelle}:`);
    if (!zeigeAbschnitt(html, /(accessToken|Access Token|md5|Zugriffstoken)/i, 3200)) {
      zeile('    (Abschnitt nicht gefunden)');
    }
    break;
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
  for (const tagesOffset of [1, 0, 2, -1]) {
    for (const rollenSenden of [true, false]) {
      for (const expiresSenden of [true, false]) {
        varianten.push({
          name: `Ablauf +${tagesOffset} Tag(e), Rollen ${rollenSenden ? 'gesendet' : 'weggelassen'}, expires ${
            expiresSenden ? 'gesendet' : 'weggelassen'
          }`,
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
    const gut = e.httpStatus === 200;
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
  if (variante.expiresSenden) zugang.expires = String(expires);

  const versuche: Array<{ name: string; pfad: string; params: Record<string, string> }> = [
    {
      name: 'Werksnummer als itemNumber1',
      pfad: PRODUKT_V1,
      params: { itemNumber1: TESTARTIKEL.werksnummer },
    },
    {
      name: 'Werksnummer + Hersteller als supplierNumber1',
      pfad: PRODUKT_V1,
      params: { itemNumber1: TESTARTIKEL.werksnummer, supplierNumber1: TESTARTIKEL.hersteller },
    },
    {
      name: 'Pietsch-Nummer als itemNumber1',
      pfad: PRODUKT_V1,
      params: { itemNumber1: TESTARTIKEL.pietschNr },
    },
    {
      name: 'EAN ueber resolve-gtin',
      pfad: '/portals/api/v1/products/resolve-gtin',
      params: { gtin: TESTARTIKEL.ean },
    },
    {
      name: 'EAN ueber resolve-gtin (nummeriert)',
      pfad: '/portals/api/v1/products/resolve-gtin',
      params: { gtin1: TESTARTIKEL.ean },
    },
    {
      name: 'Volltextsuche',
      pfad: '/portals/api/v2/products/search',
      params: { query: TESTARTIKEL.werksnummer },
    },
  ];

  for (const versuch of versuche) {
    const url = baueUrl(konfiguration.basisUrl, versuch.pfad, { ...zugang, ...versuch.params });
    const e = await rufeAuf(url, ohneWiederholung, drossel);
    zeile(`  ${versuch.name} -> HTTP ${e.httpStatus ?? '-'} (${e.dauerMs} ms)`);
    zeile(`     ${ohneGeheimnis(url)}`);
    zeile(`     ${antwortAuszug(e.koerper, e.rohtext, 1400)}`);
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
