/**
 * Zuordnung Herstellername -> OXOMI-Lieferantennummer.
 *
 * Warum das gebraucht wird: OXOMI erwartet in der Produktauskunft seine eigene
 * Lieferantennummer (z. B. "16060"), nicht den Herstellernamen. Der SAP-Export
 * liefert weder die eine noch die andere - er liefert die Werksnummer und einen
 * Herstellernamen, der bestenfalls in der Bezeichnung steckt.
 *
 * Der Ausweg: Jede erfolgreiche EAN-Aufloesung verraet die Lieferantennummer.
 * Sie wird hier gemerkt. Ab dann laesst sich ein Artikel desselben Herstellers
 * auch ohne EAN finden - ueber Werksnummer plus gelernte Lieferantennummer.
 * Das ist genau die Kaskadenstufe 2 aus UEBERGABE.md Abschnitt 7: "gegen
 * artikel_cache, dort sammeln sich Zuordnungen".
 */

export interface LieferantZuordnung {
  /** Normalisierter Herstellername. */
  hersteller: string;
  supplierNumber: string;
  /** Wie oft diese Zuordnung bisher belegt wurde. */
  belege: number;
}

export interface LieferantenSpeicher {
  finde(hersteller: string): Promise<LieferantZuordnung | null>;
  merke(hersteller: string, supplierNumber: string): Promise<void>;
  alle?(): Promise<LieferantZuordnung[]>;
}

/**
 * Vereinheitlicht Herstellernamen: Kleinschreibung, ohne Sonderzeichen.
 * "Villeroy & Boch" und "villeroy&boch" werden derselbe Schluessel.
 *
 * Zusammengesetzte Angaben wie "GSH / VitrA" oder "Geberit/Keramag" nennen zwei
 * Firmen: die Vertriebsgesellschaft und den Fertiger. In OXOMI zaehlt die
 * Erstgenannte, deshalb wird am Schraegstrich getrennt und der erste Teil
 * genommen. Beide Teile werden zusaetzlich als eigene Schluessel gemerkt, damit
 * ein spaeterer Treffer ueber den Fertiger ebenfalls greift.
 */
export function normalisiereHerstellername(roh: string | null | undefined): string | null {
  const teil = (roh ?? '').split('/')[0];
  const schluessel = teil
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '');
  return schluessel === '' ? null : schluessel;
}

/** Alle Schreibweisen, unter denen ein Herstellername gemerkt werden soll. */
export function herstellerSchluessel(roh: string | null | undefined): string[] {
  const teile = (roh ?? '').split('/');
  const schluessel = new Set<string>();
  for (const teil of teile) {
    const s = normalisiereHerstellername(teil);
    if (s) schluessel.add(s);
  }
  const ganz = normalisiereHerstellername((roh ?? '').replace(/\//g, ' '));
  if (ganz) schluessel.add(ganz);
  return [...schluessel];
}

/** Umsetzung im Arbeitsspeicher, fuer Tests und den Betrieb ohne Datenbank. */
export function speicherLieferanten(): LieferantenSpeicher {
  const ablage = new Map<string, LieferantZuordnung>();

  return {
    async finde(hersteller) {
      for (const schluessel of herstellerSchluessel(hersteller)) {
        const treffer = ablage.get(schluessel);
        if (treffer) return treffer;
      }
      return null;
    },
    async merke(hersteller, supplierNumber) {
      for (const schluessel of herstellerSchluessel(hersteller)) {
        const vorher = ablage.get(schluessel);
        ablage.set(schluessel, {
          hersteller: schluessel,
          supplierNumber,
          belege: (vorher?.supplierNumber === supplierNumber ? vorher.belege : 0) + 1,
        });
      }
    },
    async alle() {
      return [...ablage.values()];
    },
  };
}
