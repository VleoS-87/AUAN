/**
 * Suchwege gegen OXOMI - die technische Umsetzung der Matching-Kaskade aus
 * UEBERGABE.md Abschnitt 7.
 *
 * OFFENER PUNKT (Stand T-A): Der genaue Dienstpfad und die Parameternamen der
 * OXOMI-Produktauskunft sind aus der oeffentlichen Dokumentation nur teilweise
 * belegt. Belegt ist: bis zu 30 Produkte je Aufruf ueber die durchnummerierten
 * Parameter itemNumber / supplierNumber / productId. Nicht belegt ist, ob im
 * Pietsch-Portal die Werksnummer oder die Pietsch-Nummer als itemNumber gilt.
 *
 * Deshalb ist ein Kalibrierlauf vorgesehen (siehe kalibrierung.ts): Er probiert
 * die dokumentierten Kandidaten gegen einen echten Testartikel im Deployment
 * und zeigt, welcher Weg antwortet. Danach wird der bestaetigte Weg hier
 * festgeschrieben - mit Commit, damit die Entscheidung nachvollziehbar bleibt.
 */
import type { ArtikelSchluessel } from './types';

/** Bestaetigter Pfad der Produktauskunft. Wird nach dem Kalibrierlauf gesetzt. */
export const PRODUKT_PFAD = '/service/json/product/info';

/** Weitere Pfade, die der Kalibrierlauf mitprueft. */
export const KALIBRIER_PFADE: ReadonlyArray<{ pfad: string; zweck: string }> = [
  { pfad: '/service/json/product/info', zweck: 'Produktauskunft (Hauptkandidat)' },
  { pfad: '/service/json/product/details', zweck: 'Produktauskunft, alternative Benennung' },
  { pfad: '/service/json/products/info', zweck: 'Produktauskunft, Mehrzahlform' },
  { pfad: '/service/json/portal/attachments', zweck: 'Artikelanhaenge (Bilder, Datenblaetter)' },
  { pfad: '/service/json/portal/item-attachments', zweck: 'Artikelanhaenge, alternative Benennung' },
  { pfad: '/service/json/portal/datasheets', zweck: 'Datenblaetter' },
  { pfad: '/service/json/search/products', zweck: 'Produktsuche' },
  { pfad: '/service/json/search/articles', zweck: 'Artikelsuche' },
  { pfad: '/service/json/portal/info', zweck: 'Portalauskunft (prueft nur die Anmeldung)' },
];

export interface Suchweg {
  id: string;
  /** Klartext fuer den Statusbericht. */
  beschreibung: string;
  pfad: string;
  /** Baut die Suchparameter. Gibt null zurueck, wenn der Weg hier nicht anwendbar ist. */
  params(schluessel: ArtikelSchluessel): Record<string, string> | null;
}

function sauber(wert: string | null | undefined): string | null {
  const t = (wert ?? '').trim();
  return t === '' ? null : t;
}

/** Fuehrende Nullen entfernen: "083054001" -> "83054001". */
function ohneFuehrendeNullen(nummer: string): string {
  return nummer.replace(/^0+/, '');
}

/**
 * Die Kaskade in der Reihenfolge, in der sie durchlaufen wird. Der erste Weg
 * mit Treffer gewinnt; welcher es war, steht spaeter am Ergebnis.
 */
export const SUCHWEGE: ReadonlyArray<Suchweg> = [
  {
    id: 'werksnummer-mit-hersteller',
    beschreibung: 'Werksnummer des Herstellers zusammen mit dem Herstellernamen',
    pfad: PRODUKT_PFAD,
    params: (s) => {
      const werk = sauber(s.werksnummer);
      const her = sauber(s.hersteller);
      if (!werk || !her) return null;
      return { itemNumber: werk, supplierNumber: her };
    },
  },
  {
    id: 'werksnummer',
    beschreibung: 'Werksnummer des Herstellers allein',
    pfad: PRODUKT_PFAD,
    params: (s) => {
      const werk = sauber(s.werksnummer);
      return werk ? { itemNumber: werk } : null;
    },
  },
  {
    id: 'pietsch-nr',
    beschreibung: 'Pietsch-Artikelnummer',
    pfad: PRODUKT_PFAD,
    params: (s) => {
      const nr = sauber(s.pietschNr);
      return nr ? { itemNumber: nr } : null;
    },
  },
  {
    id: 'pietsch-nr-ohne-nullen',
    beschreibung: 'Pietsch-Artikelnummer ohne fuehrende Nullen',
    pfad: PRODUKT_PFAD,
    params: (s) => {
      const nr = sauber(s.pietschNr);
      if (!nr) return null;
      const kurz = ohneFuehrendeNullen(nr);
      return kurz && kurz !== nr ? { itemNumber: kurz } : null;
    },
  },
  {
    id: 'ean',
    beschreibung: 'EAN/GTIN',
    pfad: PRODUKT_PFAD,
    params: (s) => {
      const ean = sauber(s.ean);
      return ean ? { itemNumber: ean } : null;
    },
  },
  {
    id: 'suche-ean',
    beschreibung: 'Volltextsuche ueber die EAN',
    pfad: '/service/json/search/products',
    params: (s) => {
      const ean = sauber(s.ean);
      return ean ? { query: ean } : null;
    },
  },
  {
    id: 'suche-werksnummer',
    beschreibung: 'Volltextsuche ueber die Werksnummer',
    pfad: '/service/json/search/products',
    params: (s) => {
      const werk = sauber(s.werksnummer);
      return werk ? { query: werk } : null;
    },
  },
];
