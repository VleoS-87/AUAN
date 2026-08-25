/**
 * Oeffentliche Typen des OXOMI-Anreicherungsbausteins.
 *
 * Dieses Modul ist bewusst frei von Abhaengigkeiten zum uebrigen AUAN-Code,
 * damit es spaeter von einem zweiten Projekt (Kojen-Plattform) mitgenutzt
 * werden kann (UEBERGABE.md Abschnitt 5).
 */

/** Womit ein Artikel gesucht wird. Mindestens ein Feld muss gefuellt sein. */
export interface ArtikelSchluessel {
  /** Artikelnummer im Pietsch-Sortiment, z. B. "083054001". */
  pietschNr?: string | null;
  /** Herstellername als Klartext, z. B. "hansgrohe". */
  hersteller?: string | null;
  /** Artikelnummer des Herstellers (Lieferantenmaterialnummer), z. B. "60133450". */
  werksnummer?: string | null;
  /** EAN/GTIN, z. B. "4059625478899". */
  ean?: string | null;
  /** Interner Matchcode, falls vorhanden. */
  matchcode?: string | null;
  /**
   * Bezeichnung aus dem Angebot. Dient nur als Rueckfall fuer den
   * Kapitelvorschlag, wenn OXOMI keine Bezeichnung liefert - nie als Faktenquelle.
   */
  bezeichnungHinweis?: string | null;
}

export type Trefferstatus =
  /** OXOMI kennt den Artikel und hat verwertbare Inhalte geliefert. */
  | 'treffer'
  /** OXOMI kennt den Artikel, es fehlen aber Bilder oder Fakten. */
  | 'teiltreffer'
  /** OXOMI kennt den Artikel nicht. */
  | 'kein_treffer'
  /** Technische Stoerung (Zeitueberschreitung, Anmeldung, Netz). Kein Aussage ueber den Artikel. */
  | 'fehler'
  /** Zugangsdaten fehlen, es wurde gar nicht erst gefragt. */
  | 'nicht_konfiguriert';

export type Inhaltsquelle = 'oxomi' | 'manuell';

export interface ArtikelBild {
  /** Hoechste im Browser und im Druck nutzbare Aufloesung. */
  url: string;
  /** Kleinere Vorschau, falls OXOMI eine liefert. */
  vorschauUrl?: string;
  /**
   * Originaldatei beim Hersteller. Kann ein Druckformat wie EPS sein, das kein
   * Browser anzeigt - fuer den Druck aber die beste Quelle.
   */
  originalUrl?: string;
  breite?: number;
  hoehe?: number;
  /** Bezeichnung der Bildart aus OXOMI, z. B. "Produktbild", "Vermaßte Strichzeichnung". */
  art?: string;
  titel?: string;
  /**
   * Massskizze statt Produktbild. In der Mappe stehen diese gesammelt auf einer
   * eigenen Seite hinten (UEBERGABE.md Abschnitt 7), nicht beim Artikel.
   */
  istMasszeichnung: boolean;
  quelle: Inhaltsquelle;
}

export interface ArtikelFakt {
  /** Merkmalsname, z. B. "Breite". */
  name: string;
  /** Wert als Text, z. B. "550". */
  wert: string;
  /** Einheit, z. B. "mm". */
  einheit?: string;
  quelle: Inhaltsquelle;
}

/** Wie OXOMI den Artikel intern fuehrt. Ergebnis der EAN-Aufloesung. */
export interface OxomiKennung {
  /** OXOMI-Lieferantennummer, z. B. "16060". Nicht der Herstellername. */
  supplierNumber: string;
  /** Artikelnummer des Lieferanten in OXOMI. */
  supplierItemNumber: string;
  productId?: string;
}

export interface EclassInfo {
  /** Klassifikationsschluessel, wie OXOMI ihn liefert. */
  code: string;
  version?: string;
  bezeichnung?: string;
}

export interface ArtikelDokument {
  url: string;
  titel?: string;
  art?: string;
}

/** Kapitel der Mappe laut UEBERGABE.md Abschnitt 7. */
export type Kapitel =
  | 'Waschtischanlage'
  | 'WC-Anlage'
  | 'Urinal'
  | 'Wannenanlage'
  | 'Duschanlage'
  | 'Unterputztechnik'
  | 'Ausstattungsgegenstaende'
  | 'Waermequellen';

export interface Kapitelvorschlag {
  kapitel: Kapitel | null;
  /** Woraus der Vorschlag stammt - fuer den Review sichtbar. */
  grundlage: 'eclass' | 'bezeichnung' | 'kein_vorschlag';
  /** Der Treffer, der den Ausschlag gab (Stichwort oder eCl@ss-Code). */
  beleg?: string;
}

/** Ergebnis der Anreicherung eines Artikels. */
export interface ArtikelDaten {
  /** Normalisierter Cache-Schluessel. */
  cacheSchluessel: string;
  schluessel: ArtikelSchluessel;
  status: Trefferstatus;

  bezeichnung?: string;
  langtext?: string;
  hersteller?: string;
  serie?: string;

  bilder: ArtikelBild[];
  fakten: ArtikelFakt[];
  /** Freitext-Eigenschaften ohne Merkmalsnamen, z. B. "Unterbaufaehig". */
  eigenschaften: string[];
  eclass?: EclassInfo | null;
  dokumente: ArtikelDokument[];
  kapitelvorschlag: Kapitelvorschlag;
  /** Die Kennung, unter der OXOMI den Artikel fuehrt. Fuer Folgeabfragen. */
  oxomiKennung?: OxomiKennung;

  /** Woher die ausgelieferten Daten kommen. */
  quelle: 'cache' | 'oxomi' | 'manuell';
  /** Zeitpunkt der Erhebung (ISO 8601). */
  stand: string;
  /** Welcher Suchweg den Treffer gebracht hat, z. B. "werksnummer". */
  suchweg?: string;
  /** Klartext-Hinweise auf Luecken oder Stoerungen, fuer den Badverkaeufer lesbar. */
  hinweise: string[];
}

export interface AnreicherungsOptionen {
  /** Cache ignorieren und frisch bei OXOMI fragen. */
  cacheUmgehen?: boolean;
  /** Cache-Eintraege, die aelter sind als diese Anzahl Tage, gelten als veraltet. */
  maxAlterTage?: number;
  /** Diagnosedaten (roher OXOMI-Rumpf, preisbereinigt) mitliefern. Nur fuer die Testroute. */
  mitDiagnose?: boolean;
}

/** Diagnose eines einzelnen OXOMI-Aufrufs. Enthaelt niemals Zugangsdaten. */
export interface AufrufDiagnose {
  suchweg: string;
  beschreibung: string;
  /** Angefragte Adresse, accessToken und secret sind ersetzt. */
  urlOhneGeheimnis: string;
  httpStatus?: number;
  dauerMs: number;
  fehler?: string;
  /** Gekuerzte, preisbereinigte Antwort. */
  antwortAuszug?: string;
  /** Hat dieser Weg einen Artikel geliefert? */
  treffer: boolean;
}
