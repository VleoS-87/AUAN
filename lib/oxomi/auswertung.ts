/**
 * Wandelt eine OXOMI-Antwort in die AUAN-Artikeldaten.
 *
 * Der Auswerter ist bewusst tolerant gebaut: Er sucht in der Antwortstruktur
 * nach Bildern, Merkmalen und der eCl@ss-Angabe, statt eine feste Feldstruktur
 * vorauszusetzen. Grund: Die genaue Antwortform der Produktauskunft ist erst
 * nach dem Kalibrierlauf gegen das echte Portal belegt (siehe suchwege.ts).
 * Er erfindet dabei nichts - er liest nur, was in den Daten steht
 * (Grundregel 3 aus UEBERGABE.md Abschnitt 2).
 */
import { istPreisFeld } from './preissperre';
import type { ArtikelBild, ArtikelDokument, ArtikelFakt, EclassInfo } from './types';

const MAX_BILDER = 30;
const MAX_FAKTEN = 60;
const MAX_DOKUMENTE = 20;
const MAX_TIEFE = 14;

const BILD_ENDUNGEN = /\.(jpe?g|png|webp|gif|tiff?|bmp)(\?|#|$)/i;
const DOKUMENT_ENDUNGEN = /\.(pdf)(\?|#|$)/i;

const SCHLUESSEL_BILD = /(bild|image|picture|photo|foto|thumb|preview|vorschau|media|asset)/i;
const SCHLUESSEL_URL = /^(url|link|href|src|uri|downloadurl|imageurl|bildurl)$/i;
const SCHLUESSEL_MERKMALE = /(attribut|merkmal|feature|propert|eigenschaft|characteristic|spezifikation|technisch)/i;
const SCHLUESSEL_ECLASS = /(eclass|ecl@?ss|classification|klassifik)/i;
const SCHLUESSEL_HERSTELLER = /^(supplier|suppliername|hersteller|manufacturer|brand|marke|lieferant)(name)?$/i;
const SCHLUESSEL_SERIE = /^(serie|series|range|produktlinie|linie|programm|collection)$/i;
const SCHLUESSEL_BEZEICHNUNG = /^(name|title|titel|bezeichnung|shorttext|kurztext|productname|itemname)$/i;
const SCHLUESSEL_LANGTEXT = /^(longtext|langtext|description|beschreibung|text|produkttext|marketingtext)$/i;

const NAMENSFELDER = ['name', 'label', 'bezeichnung', 'key', 'schluessel', 'titel', 'title', 'caption', 'merkmal'];
const WERTFELDER = ['value', 'wert', 'val', 'content', 'inhalt', 'text', 'auspraegung'];
const EINHEITFELDER = ['unit', 'einheit', 'uom', 'masseinheit'];

export interface Auswertung {
  bezeichnung?: string;
  langtext?: string;
  hersteller?: string;
  serie?: string;
  bilder: ArtikelBild[];
  fakten: ArtikelFakt[];
  eclass: EclassInfo | null;
  dokumente: ArtikelDokument[];
  /** Anzahl der im Rumpf gefundenen Objekte, die wie ein Artikel aussehen. */
  artikelObjekte: number;
}

export function werteAus(rumpf: unknown): Auswertung {
  const bilder = new Map<string, ArtikelBild>();
  const dokumente = new Map<string, ArtikelDokument>();
  const fakten: ArtikelFakt[] = [];

  let bezeichnung: string | undefined;
  let langtext: string | undefined;
  let hersteller: string | undefined;
  let serie: string | undefined;
  let eclass: EclassInfo | null = null;
  let artikelObjekte = 0;

  const besuche = (wert: unknown, pfad: string[], tiefe: number): void => {
    if (tiefe > MAX_TIEFE || wert === null || wert === undefined) return;

    if (Array.isArray(wert)) {
      for (const eintrag of wert) besuche(eintrag, pfad, tiefe + 1);
      return;
    }

    if (typeof wert === 'string') {
      sammleUrl(wert, pfad, bilder, dokumente);
      return;
    }

    if (typeof wert !== 'object') return;

    const objekt = wert as Record<string, unknown>;
    const schluessel = Object.keys(objekt);

    if (schluessel.some((s) => /^(itemnumber|artikelnummer|productid|supplierid)$/i.test(s))) {
      artikelObjekte += 1;
    }

    // Name/Wert-Paar? Dann ist es ein Merkmal.
    const fakt = alsFakt(objekt);
    if (fakt) {
      if (fakten.length < MAX_FAKTEN && !fakten.some((f) => f.name === fakt.name && f.wert === fakt.wert)) {
        fakten.push(fakt);
      }
      // Ein Merkmal kann trotzdem ein Bild verlinken - weiterlaufen.
    }

    // Bildobjekt? Erkennbar an einem URL-Feld im Bildkontext.
    const bild = alsBild(objekt);
    if (bild && !bilder.has(bild.url) && bilder.size < MAX_BILDER) {
      bilder.set(bild.url, bild);
    }

    for (const [s, inhalt] of Object.entries(objekt)) {
      if (istPreisFeld(s)) continue; // Grundregel 1

      const unterPfad = [...pfad, s];

      if (typeof inhalt === 'string' && inhalt.trim() !== '') {
        const text = inhalt.trim();
        if (!bezeichnung && SCHLUESSEL_BEZEICHNUNG.test(s) && text.length <= 200) bezeichnung = text;
        else if (!langtext && SCHLUESSEL_LANGTEXT.test(s) && text.length > 60) langtext = text;
        if (!hersteller && SCHLUESSEL_HERSTELLER.test(s) && text.length <= 120) hersteller = text;
        if (!serie && SCHLUESSEL_SERIE.test(s) && text.length <= 120) serie = text;
        if (!eclass && SCHLUESSEL_ECLASS.test(s) && /\d/.test(text)) {
          eclass = { code: text };
        }
      }

      if (!eclass && SCHLUESSEL_ECLASS.test(s) && inhalt && typeof inhalt === 'object') {
        eclass = alsEclass(inhalt as Record<string, unknown>);
      }

      besuche(inhalt, unterPfad, tiefe + 1);
    }
  };

  besuche(rumpf, [], 0);

  return {
    bezeichnung,
    langtext,
    hersteller,
    serie,
    bilder: [...bilder.values()],
    fakten,
    eclass,
    dokumente: [...dokumente.values()].slice(0, MAX_DOKUMENTE),
    artikelObjekte,
  };
}

function textVon(objekt: Record<string, unknown>, felder: string[]): string | undefined {
  for (const feld of felder) {
    for (const [s, wert] of Object.entries(objekt)) {
      if (s.toLowerCase() !== feld) continue;
      if (typeof wert === 'string' && wert.trim() !== '') return wert.trim();
      if (typeof wert === 'number' || typeof wert === 'boolean') return String(wert);
    }
  }
  return undefined;
}

function alsFakt(objekt: Record<string, unknown>): ArtikelFakt | null {
  const name = textVon(objekt, NAMENSFELDER);
  const wert = textVon(objekt, WERTFELDER);
  if (!name || !wert) return null;
  if (name.length > 80 || wert.length > 300) return null;
  if (istPreisFeld(name)) return null; // Grundregel 1
  const einheit = textVon(objekt, EINHEITFELDER);
  return { name, wert, ...(einheit ? { einheit } : {}), quelle: 'oxomi' };
}

function alsBild(objekt: Record<string, unknown>): ArtikelBild | null {
  let url: string | undefined;
  for (const [s, wert] of Object.entries(objekt)) {
    if (typeof wert !== 'string' || wert.trim() === '') continue;
    if (SCHLUESSEL_URL.test(s) || SCHLUESSEL_BILD.test(s)) {
      if (istBildUrl(wert)) {
        url = wert.trim();
        break;
      }
    }
  }
  if (!url) return null;

  const breite = zahlVon(objekt, ['width', 'breite', 'pixelwidth']);
  const hoehe = zahlVon(objekt, ['height', 'hoehe', 'pixelheight']);
  const art = textVon(objekt, ['type', 'typ', 'art', 'kind', 'category', 'kategorie']);
  const titel = textVon(objekt, ['title', 'titel', 'name', 'bezeichnung', 'caption']);
  const vorschau = ersteBildUrl(objekt, ['thumbnail', 'thumb', 'preview', 'vorschau', 'small']);

  return {
    url,
    ...(vorschau ? { vorschauUrl: vorschau } : {}),
    ...(breite ? { breite } : {}),
    ...(hoehe ? { hoehe } : {}),
    ...(art ? { art } : {}),
    ...(titel ? { titel } : {}),
    quelle: 'oxomi' as const,
  };
}

function ersteBildUrl(objekt: Record<string, unknown>, felder: string[]): string | undefined {
  for (const [s, wert] of Object.entries(objekt)) {
    if (typeof wert !== 'string') continue;
    if (felder.some((f) => s.toLowerCase().includes(f)) && istBildUrl(wert)) return wert.trim();
  }
  return undefined;
}

function zahlVon(objekt: Record<string, unknown>, felder: string[]): number | undefined {
  for (const [s, wert] of Object.entries(objekt)) {
    if (!felder.includes(s.toLowerCase())) continue;
    const n = typeof wert === 'number' ? wert : Number(wert);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

function istBildUrl(wert: string): boolean {
  const t = wert.trim();
  if (!/^https?:\/\//i.test(t) && !t.startsWith('//')) return false;
  return BILD_ENDUNGEN.test(t) || /(image|bild|thumb|preview|media)/i.test(t);
}

function sammleUrl(
  wert: string,
  pfad: string[],
  bilder: Map<string, ArtikelBild>,
  dokumente: Map<string, ArtikelDokument>,
): void {
  const t = wert.trim();
  if (!/^https?:\/\//i.test(t)) return;
  const letzterSchluessel = pfad[pfad.length - 1] ?? '';

  if (DOKUMENT_ENDUNGEN.test(t)) {
    if (!dokumente.has(t)) dokumente.set(t, { url: t, art: letzterSchluessel || undefined });
    return;
  }

  if (BILD_ENDUNGEN.test(t) || (SCHLUESSEL_BILD.test(letzterSchluessel) && istBildUrl(t))) {
    if (!bilder.has(t) && bilder.size < MAX_BILDER) {
      bilder.set(t, { url: t, quelle: 'oxomi', art: letzterSchluessel || undefined });
    }
  }
}

function alsEclass(objekt: Record<string, unknown>): EclassInfo | null {
  const code =
    textVon(objekt, ['code', 'key', 'schluessel', 'id', 'number', 'nummer', 'classid', 'value', 'wert']) ??
    undefined;
  if (!code || !/\d/.test(code)) return null;
  return {
    code,
    version: textVon(objekt, ['version', 'release']),
    bezeichnung: textVon(objekt, ['name', 'label', 'bezeichnung', 'title', 'titel', 'description']),
  };
}
