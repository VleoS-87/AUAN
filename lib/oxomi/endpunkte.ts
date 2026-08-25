/**
 * Die OXOMI-Schnittstelle, wie sie im Kalibrierlauf vom 25.08.2026 gegen das
 * echte Pietsch-Portal gemessen wurde. Nichts hier ist geraten.
 *
 * Anmeldung (gilt fuer alle Aufrufe, als Adressparameter):
 *   portal        die Portal-Kennung (aus der hinterlegten Portaladresse geloest)
 *   user          der technische Benutzer
 *   accessToken   md5(secret + md5(secret + portal + user + tagesnummer + rollen))
 *   roles         nur wenn Rollen benutzt werden
 *   language      optional, zweistelliger Sprachcode ("de")
 * `expires` wird NICHT mitgeschickt - OXOMI leitet die Tagesnummer selbst ab.
 */

/** EAN/GTIN aufloesen. GET. Antwort: {resolved, supplierNumber, supplierItemNumber}. */
export const GTIN_AUFLOESEN = '/portals/api/v1/products/resolve-gtin';

/** Produktauskunft V2. POST mit JSON-Rumpf, bis zu 30 Artikel je Aufruf. */
export const PRODUKTDATEN_V2 = '/portals/api/v2/product/data';

/** Produktauskunft V1. GET, verlangt itemNumber1 UND supplierNumber1. */
export const PRODUKTDATEN_V1 = '/portals/api/v1/product/data';

/**
 * Abfragearten, die dieses Portal kennt (gemessen).
 *
 * Die wichtigste ist `features`: Sie liefert die Klassifikation des Artikels und
 * seine Merkmale als saubere Name/Wert-Paare mit Codes - im ETIM-Schema
 * (Klassen EC…, Merkmale EF…), von OXOMI als "metaclass" gefuehrt. Das ist die
 * strukturierte Faktengrundlage, die das Fachkonzept unter dem Stichwort
 * eCl@ss vorgesehen hatte.
 *
 * NICHT verfuegbar sind: eclass, classification, attributes, etim (unter diesem
 * Namen), details, product-details, product-texts, brand, series, catalogs,
 * datasheet, documents. Sie antworten mit "Cannot find ... of type
 * ProductDataProvider".
 *
 * BEWUSST NICHT ABGEFRAGT wird `properties`. Die Abfrage existiert, liefert aber
 * kaufmaennische und logistische Angaben (Gefahrgut, Zolltarif, Lieferzeit,
 * WEEE-Nummer, Verkaufsinformationen). Nichts davon gehoert in eine
 * Kundenmappe, und der Block traegt Verkaufsdaten - er bleibt draussen.
 */
export const ABFRAGEARTEN = {
  bilder: 'product-images',
  merkmale: 'features',
  texte: 'texts',
  anhaenge: 'attachments',
  seiten: 'pages',
  videos: 'videos',
} as const;

/** Was AUAN je Artikel bei OXOMI anfragt. */
export function baueAbfragen(maxBilder = 12): Record<string, unknown> {
  return {
    [ABFRAGEARTEN.bilder]: { type: 'json', settings: { limit: maxBilder } },
    [ABFRAGEARTEN.merkmale]: { type: 'json' },
    [ABFRAGEARTEN.texte]: { type: 'json' },
    [ABFRAGEARTEN.anhaenge]: { type: 'json' },
    [ABFRAGEARTEN.seiten]: { type: 'json' },
  };
}

// ---------------------------------------------------------------------------
// Antwortformen, wie gemessen
// ---------------------------------------------------------------------------

export interface GtinAntwort {
  success?: boolean;
  error?: boolean;
  resolved?: boolean;
  supplierNumber?: string;
  supplierItemNumber?: string;
  message?: string;
}

export interface OxomiBild {
  /** COLORED_IMAGE, MEASURED_DRAWING, ... */
  type?: string;
  /** "Produktbild", "Vermaßte Strichzeichnung", ... */
  typeName?: string;
  description?: string | null;
  filename?: string;
  iconUrl?: string;
  /** Originaldatei. Kann ein Druckformat wie EPS sein und im Browser nicht anzeigbar. */
  downloadUrl?: string;
  previewImageUrl?: string;
  mediumImageUrl?: string;
  /** Hoechste im Web nutzbare Aufloesung. */
  hdImageUrl?: string;
  fingerprint?: string;
  fileSizeInBytes?: number;
}

export interface OxomiText {
  /** SHORT_DESCRIPTION, DESCRIPTION, LONG_TEXT, ... */
  type?: string;
  typeName?: string;
  optimizedText?: string;
  normalizedText?: string;
}

export interface OxomiDokument {
  id?: string;
  name?: string;
  brand?: string;
  previewUrl?: string;
  mediumUrl?: string;
  pages?: Array<{ pageNumber?: number; previewUrl?: string; mediumUrl?: string }>;
}

/** Klassifikation des Artikels, z. B. {code: "EC011550", name: "Waschbecken"}. */
export interface OxomiKlasse {
  code?: string;
  name?: string;
  /** Klassifikationssystem, gemessen: "metaclass" (ETIM-Schema). */
  system?: string;
}

/** Ein Merkmal, z. B. {code: "EF000007", name: "Farbe", value: "weiß"}. */
export interface OxomiMerkmal {
  code?: string;
  system?: string;
  name?: string;
  value?: string;
  unit?: string;
}

export interface OxomiAbfrageErgebnis {
  type?: string;
  error?: boolean;
  message?: string;
  images?: OxomiBild[];
  texts?: OxomiText[];
  attachments?: OxomiDokument[];
  documents?: OxomiDokument[];
  class?: OxomiKlasse;
  features?: OxomiMerkmal[];
}

export interface OxomiProdukt {
  productId?: string;
  supplierNumber?: string;
  itemNumber?: string;
  resolved?: boolean;
  /** V2 liefert ein Objekt, V1 eine Liste. */
  queries?: Record<string, OxomiAbfrageErgebnis> | Array<OxomiAbfrageErgebnis & { name?: string }>;
}

export interface ProduktdatenAntwort {
  success?: boolean;
  error?: boolean;
  message?: string;
  products?: OxomiProdukt[];
}

/** Vereinheitlicht die beiden Formen der Abfrageergebnisse. */
export function abfragenAlsKarte(
  produkt: OxomiProdukt,
): Record<string, OxomiAbfrageErgebnis> {
  const abfragen = produkt.queries;
  if (!abfragen) return {};
  if (Array.isArray(abfragen)) {
    const karte: Record<string, OxomiAbfrageErgebnis> = {};
    for (const eintrag of abfragen) {
      if (eintrag?.name) karte[eintrag.name] = eintrag;
    }
    return karte;
  }
  return abfragen;
}
