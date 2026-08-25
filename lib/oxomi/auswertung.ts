/**
 * Wandelt eine OXOMI-Produktantwort in AUAN-Artikeldaten.
 *
 * Die Zuordnung folgt der im Kalibrierlauf gemessenen Antwortstruktur
 * (siehe endpunkte.ts). Sie liest nur, was in den Daten steht, und erfindet
 * nichts (Grundregel 3 aus UEBERGABE.md Abschnitt 2).
 *
 * Die Merkmale kommen aus zwei Quellen, in dieser Reihenfolge:
 *
 *   1. Die Klassifikation (`features`). Sie liefert Klasse und Merkmale als
 *      saubere Name/Wert-Paare mit Codes im ETIM-Schema (EC…/EF…). Das ist die
 *      belastbare Quelle: jeder Wert traegt einen Schluessel und ist zwischen
 *      Herstellern vergleichbar.
 *   2. Der Beschreibungstext, falls die Klassifikation fuer einen Artikel fehlt.
 *      OXOMI liefert ihn in `normalizedText` bereits zeilenweise gegliedert;
 *      Zeilen der Form "Merkmal: Wert" werden uebernommen.
 *
 * Am Ergebnis steht je Merkmal, aus welcher Quelle es stammt - im Review und in
 * der Mappe ist das der Unterschied zwischen belegt und abgeleitet.
 */
import { istPreisFeld } from './preissperre.ts';
import {
  ABFRAGEARTEN,
  abfragenAlsKarte,
  type OxomiBild,
  type OxomiDokument,
  type OxomiMerkmal,
  type OxomiProdukt,
  type OxomiText,
} from './endpunkte.ts';
import type { ArtikelBild, ArtikelDokument, ArtikelFakt, Klassifikation } from './types.ts';

const MAX_BILDER = 20;
const MAX_FAKTEN = 40;
const MAX_DOKUMENTE = 20;

export interface Auswertung {
  bezeichnung?: string;
  langtext?: string;
  hersteller?: string;
  klassifikation: Klassifikation | null;
  bilder: ArtikelBild[];
  fakten: ArtikelFakt[];
  dokumente: ArtikelDokument[];
  /** Freitext-Eigenschaften ohne Merkmalsnamen, z. B. "Unterbaufaehig". */
  eigenschaften: string[];
  gefunden: boolean;
}

export function werteProduktAus(produkt: OxomiProdukt | undefined): Auswertung {
  const leer: Auswertung = {
    klassifikation: null,
    bilder: [],
    fakten: [],
    dokumente: [],
    eigenschaften: [],
    gefunden: false,
  };
  if (!produkt) return leer;

  const abfragen = abfragenAlsKarte(produkt);

  const bilder = werteBilderAus(abfragen[ABFRAGEARTEN.bilder]?.images ?? []);
  const texte = abfragen[ABFRAGEARTEN.texte]?.texts ?? [];
  const dokumente = werteDokumenteAus([
    ...(abfragen[ABFRAGEARTEN.anhaenge]?.attachments ?? []),
    ...(abfragen[ABFRAGEARTEN.anhaenge]?.documents ?? []),
    ...(abfragen[ABFRAGEARTEN.seiten]?.documents ?? []),
  ]);

  const ausTexten = werteTexteAus(texte);

  // Die Klassifikation hat Vorrang: Ihre Werte tragen Codes und sind zwischen
  // Herstellern vergleichbar. Der Beschreibungstext springt nur ein, wenn sie fehlt.
  const merkmalsAbfrage = abfragen[ABFRAGEARTEN.merkmale];
  const klassifikation = alsKlassifikation(merkmalsAbfrage?.class);
  const ausKlassifikation = werteMerkmaleAus(merkmalsAbfrage?.features ?? []);

  return {
    bezeichnung: ausTexten.bezeichnung,
    langtext: ausTexten.langtext,
    hersteller: ausTexten.hersteller,
    klassifikation,
    bilder,
    fakten: ausKlassifikation.length > 0 ? ausKlassifikation : ausTexten.fakten,
    dokumente,
    eigenschaften: ausTexten.eigenschaften,
    gefunden: produkt.resolved === true,
  };
}

// ---------------------------------------------------------------------------
// Klassifikation und Merkmale
// ---------------------------------------------------------------------------

function alsKlassifikation(klasse: { code?: string; name?: string; system?: string } | undefined) {
  if (!klasse?.code) return null;
  return {
    code: klasse.code,
    ...(klasse.name ? { bezeichnung: klasse.name } : {}),
    ...(klasse.system ? { system: klasse.system } : {}),
  };
}

/**
 * Uebernimmt die Merkmale der Klassifikation unveraendert. Es wird nur
 * ausgelassen, nie umgeschrieben: Merkmale ohne Namen oder Wert, Preisfelder
 * (Grundregel 1) und Dubletten.
 */
function werteMerkmaleAus(merkmale: OxomiMerkmal[]): ArtikelFakt[] {
  const ergebnis: ArtikelFakt[] = [];

  for (const merkmal of merkmale) {
    if (ergebnis.length >= MAX_FAKTEN) break;
    const name = (merkmal.name ?? '').trim();
    const wert = (merkmal.value ?? '').trim();
    if (name === '' || wert === '') continue;
    if (istPreisFeld(name)) continue;
    if (ergebnis.some((f) => f.name === name)) continue;

    ergebnis.push({
      name,
      wert,
      ...(merkmal.unit ? { einheit: merkmal.unit } : {}),
      ...(merkmal.code ? { code: merkmal.code } : {}),
      quelle: 'oxomi',
      herkunft: 'klassifikation',
    });
  }

  return ergebnis;
}

// ---------------------------------------------------------------------------
// Bilder
// ---------------------------------------------------------------------------

/** OXOMI-Bildarten, die eine Massskizze bezeichnen. */
const MASSZEICHNUNG = /(MEASURED_DRAWING|DIMENSION|SKETCH)/i;
const MASSZEICHNUNG_TEXT = /(zeichnung|masszeichnung|maßzeichnung|skizze)/i;

/** Bilder, die in einer Kundenmappe nichts verloren haben. */
const NICHT_ZEIGEN = /(LOGO|BRAND_ICON|ICON)/i;

function werteBilderAus(bilder: OxomiBild[]): ArtikelBild[] {
  const ergebnis: ArtikelBild[] = [];
  const gesehen = new Set<string>();

  for (const bild of bilder) {
    if (ergebnis.length >= MAX_BILDER) break;
    if (bild.type && NICHT_ZEIGEN.test(bild.type)) continue;

    // Hoechste im Browser und im Druck nutzbare Aufloesung zuerst. Die
    // Originaldatei kann ein Druckformat wie EPS sein, das kein Browser zeigt.
    const anzeige = bild.hdImageUrl ?? bild.mediumImageUrl ?? bild.previewImageUrl;
    if (!anzeige) continue;

    const schluessel = bild.fingerprint ?? anzeige;
    if (gesehen.has(schluessel)) continue;
    gesehen.add(schluessel);

    const art = bild.typeName ?? bild.type;
    const beschreibung = bild.description ?? undefined;

    ergebnis.push({
      url: anzeige,
      ...(bild.mediumImageUrl || bild.previewImageUrl
        ? { vorschauUrl: bild.previewImageUrl ?? bild.mediumImageUrl }
        : {}),
      ...(bild.downloadUrl ? { originalUrl: bild.downloadUrl } : {}),
      ...(art ? { art } : {}),
      ...(beschreibung ? { titel: beschreibung } : {}),
      istMasszeichnung:
        MASSZEICHNUNG.test(bild.type ?? '') ||
        MASSZEICHNUNG_TEXT.test(art ?? '') ||
        MASSZEICHNUNG_TEXT.test(beschreibung ?? ''),
      quelle: 'oxomi',
    });
  }

  // Produktbilder zuerst, Maßzeichnungen ans Ende: In der Mappe stehen sie
  // gesammelt auf einer eigenen Seite hinten (UEBERGABE.md Abschnitt 7).
  return ergebnis.sort((a, b) => Number(a.istMasszeichnung) - Number(b.istMasszeichnung));
}

// ---------------------------------------------------------------------------
// Dokumente
// ---------------------------------------------------------------------------

function werteDokumenteAus(dokumente: OxomiDokument[]): ArtikelDokument[] {
  const ergebnis: ArtikelDokument[] = [];
  const gesehen = new Set<string>();

  for (const dokument of dokumente) {
    if (ergebnis.length >= MAX_DOKUMENTE) break;
    const url = dokument.mediumUrl ?? dokument.previewUrl ?? dokument.pages?.[0]?.mediumUrl;
    if (!url || gesehen.has(url)) continue;
    gesehen.add(url);
    ergebnis.push({
      url,
      ...(dokument.name ? { titel: dokument.name } : {}),
      ...(dokument.brand ? { art: dokument.brand } : {}),
    });
  }
  return ergebnis;
}

// ---------------------------------------------------------------------------
// Texte, Merkmale, Eigenschaften
// ---------------------------------------------------------------------------

/** Ueberschriften im Beschreibungstext, unter denen Merkmale stehen. */
const MERKMALS_ABSCHNITTE =
  /^(technische eigenschaften|masse|maße|abmessungen|farbe ?\/ ?oberflaeche|farbe ?\/ ?oberfläche|material|ausfuehrung|ausführung|lieferumfang|allgemein)/i;
/** Ueberschriften, unter denen freie Aufzaehlungen stehen. */
const EIGENSCHAFTS_ABSCHNITTE = /^(eigenschaften|verwendungszwecke|merkmale|besonderheiten|vorteile)/i;

function werteTexteAus(texte: OxomiText[]): {
  bezeichnung?: string;
  langtext?: string;
  hersteller?: string;
  fakten: ArtikelFakt[];
  eigenschaften: string[];
} {
  const kurz = findeText(texte, 'SHORT_DESCRIPTION');
  const beschreibung = findeText(texte, 'DESCRIPTION');
  const lang = findeText(texte, 'LONG_TEXT');

  const fakten: ArtikelFakt[] = [];
  const eigenschaften: string[] = [];

  // Der normalisierte Text ist bereits zeilenweise gegliedert - genau die Form,
  // aus der sich Merkmale verlaesslich lesen lassen. Nicht jeder Hersteller
  // liefert ihn; dann wird die HTML-Fassung zu Zeilen gemacht, und zur Not
  // dient der Langtext als dritte Quelle.
  const zeilen = ersteBrauchbareZeilen([
    beschreibung?.normalizedText,
    htmlZuZeilen(beschreibung?.optimizedText),
    lang?.normalizedText,
    htmlZuZeilen(lang?.optimizedText),
  ]);

  let inMerkmalen = false;
  let inEigenschaften = false;

  // Manche Hersteller liefern alle Merkmale in einer langen Komma-Kette
  // ("Kollektion: O.novo, Form: Oval, Material: Keramik"). Die wird vorher
  // wieder in einzelne Zeilen zerlegt.
  const einzelzeilen = zeilen.flatMap(zerlegeMehrfachzeile);

  for (const zeile of einzelzeilen) {
    const paar = zeile.match(/^(.{2,60}?):\s*(.+)$/);

    if (!paar) {
      // Zeile ohne Doppelpunkt: entweder Ueberschrift oder freie Aufzaehlung.
      if (MERKMALS_ABSCHNITTE.test(zeile)) {
        inMerkmalen = true;
        inEigenschaften = false;
      } else if (EIGENSCHAFTS_ABSCHNITTE.test(zeile)) {
        inMerkmalen = false;
        inEigenschaften = true;
      } else if (inEigenschaften && zeile.length <= 160 && eigenschaften.length < 12) {
        eigenschaften.push(zeile);
      } else if (zeile.length < 60 && /^[A-ZÄÖÜ]/.test(zeile)) {
        // Kurze Zeile in Grossschreibung ohne Doppelpunkt: weitere Ueberschrift.
        inMerkmalen = false;
        inEigenschaften = false;
      }
      continue;
    }

    const [, rohName, rohWert] = paar;
    const name = raeumeMerkmalsnamenAuf(rohName, rohWert);
    const wert = raeumeWertAuf(rohWert);
    if (wert === '') continue;

    if (istPreisFeld(name)) continue; // Grundregel 1
    if (wert.length > 200 || fakten.length >= MAX_FAKTEN) continue;
    if (fakten.some((f) => f.name === name)) continue;

    fakten.push({ name, wert, quelle: 'oxomi', herkunft: 'beschreibungstext' });
    // Ein Merkmalspaar ausserhalb eines Merkmalsabschnitts zaehlt trotzdem;
    // die Abschnitte steuern nur, was mit Zeilen OHNE Doppelpunkt passiert.
    void inMerkmalen;
  }

  const langtext = lang?.normalizedText ?? lang?.optimizedText ?? beschreibung?.normalizedText;
  const hersteller = kurz?.optimizedText ? ersteWortgruppe(kurz.optimizedText) : undefined;

  return {
    bezeichnung: kurz?.optimizedText ?? kurz?.normalizedText,
    langtext,
    hersteller,
    fakten,
    eigenschaften,
  };
}

function findeText(texte: OxomiText[], typ: string): OxomiText | undefined {
  return texte.find((t) => (t.type ?? '').toUpperCase() === typ);
}

/**
 * Macht aus "B / Breite (cm)" ein "Breite", wenn der Wert die Einheit ohnehin
 * schon traegt. Verkuerzt nur die Beschriftung, nie den Wert.
 */
function raeumeMerkmalsnamenAuf(rohName: string, rohWert: string): string {
  let name = rohName.trim();

  // Ein Merkmalsname traegt kein Komma. Steht eines darin, gehoert der vordere
  // Teil zur vorherigen Angabe ("5660R001, EAN Nummer" -> "EAN Nummer").
  const nachKomma = name.split(',').pop();
  if (nachKomma && nachKomma.trim().length >= 2) name = nachKomma.trim();

  // Fuehrendes Kuerzel abtrennen: "B / Breite (cm)" -> "Breite (cm)"
  const kuerzel = name.match(/^[A-ZÄÖÜ]\s*\/\s*(.+)$/);
  if (kuerzel) name = kuerzel[1].trim();

  // Einheit in Klammern weglassen, wenn sie im Wert schon steht.
  const einheit = name.match(/^(.+?)\s*\(([^)]{1,8})\)$/);
  if (einheit && new RegExp(`\\b${escapeRegex(einheit[2])}\\b`, 'i').test(rohWert)) {
    name = einheit[1].trim();
  }

  return name;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Erstes Wort der Kurzbeschreibung, meist der Herstellername. */
function ersteWortgruppe(text: string): string | undefined {
  const wort = text.trim().split(/\s+/)[0];
  return wort && wort.length >= 2 && wort.length <= 30 ? wort.replace(/[:,]$/, '') : undefined;
}

/**
 * Macht aus einer HTML-Beschreibung Zeilen. Listenpunkte, Absaetze und
 * Zeilenumbrueche werden zu Zeilengrenzen, alles andere entfaellt.
 */
function htmlZuZeilen(html: string | undefined): string | undefined {
  if (!html || !html.includes('<')) return html;
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(li|p|div|h[1-6]|ul|ol|tr)\s*>/gi, '\n')
    .replace(/<\s*(li|p|div|h[1-6]|tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ');
}

/** Nimmt die erste Textquelle, die ueberhaupt Zeilen mit Merkmalen enthaelt. */
function ersteBrauchbareZeilen(quellen: Array<string | undefined>): string[] {
  let rueckfall: string[] = [];
  for (const quelle of quellen) {
    if (!quelle) continue;
    const zeilen = quelle
      .split('\n')
      .map((z) => z.trim())
      .filter((z) => z !== '');
    if (zeilen.length === 0) continue;
    if (zeilen.some((z) => /^.{2,60}?:\s*\S/.test(z))) return zeilen;
    if (rueckfall.length === 0) rueckfall = zeilen;
  }
  return rueckfall;
}

/**
 * Zerlegt eine Zeile, die mehrere Merkmale in einer Komma-Kette traegt.
 * Getrennt wird nur an einem Komma, dem unmittelbar ein neuer Merkmalsname mit
 * Doppelpunkt folgt - so bleibt "Farbe: weiß, matt" eine einzige Angabe.
 */
export function zerlegeMehrfachzeile(zeile: string): string[] {
  if ((zeile.match(/:/g) ?? []).length < 2) return [zeile];
  return zeile
    .split(/,\s*(?=[^,:]{2,40}:\s)/)
    .map((t) => t.trim())
    .filter((t) => t !== '');
}

/** Schneidet Satzzeichen am Ende ab und entfernt eine angehaengte Ueberschrift. */
function raeumeWertAuf(rohWert: string): string {
  let wert = rohWert.trim().replace(/[;,.]+$/, '').trim();
  // "5660R0, Eigenschaften" -> "5660R0": ein angehaengtes Einzelwort in
  // Grossschreibung ohne eigenen Wert ist eine Abschnittsueberschrift.
  const angehaengt = wert.match(/^(.*?),\s*([A-ZÄÖÜ][a-zäöüß]{4,})$/);
  if (angehaengt && ABSCHNITTSWORT.test(angehaengt[2])) wert = angehaengt[1].trim();
  return wert;
}

const ABSCHNITTSWORT =
  /^(Eigenschaften|Merkmale|Abmessungen|Masse|Maße|Technische|Allgemein|Lieferumfang|Zubehoer|Zubehör|Ausfuehrung|Ausführung|Verwendungszwecke)$/;
