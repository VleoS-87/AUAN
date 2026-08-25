/**
 * Kapitelvorschlag je Artikel.
 *
 * Grundlage laut UEBERGABE.md Abschnitt 7: die eCl@ss-Klassifikation aus OXOMI
 * als strukturierte Basis, ergaenzt um die Bewertung der Bezeichnung. Der
 * Vorschlag ist ein Vorschlag - im Review korrigiert der Badverkaeufer ihn per Klick.
 *
 * OFFENER PUNKT (Stand T-A): Die Zuordnungstabelle eCl@ss-Code -> Kapitel ist
 * bewusst leer. Welche eCl@ss-Schluessel OXOMI im Pietsch-Portal tatsaechlich
 * liefert, misst erst dieser Testlauf. Erfundene Codes waeren ein Verstoss
 * gegen "Fakten nur aus Daten". Bis dahin traegt die Bezeichnung den Vorschlag;
 * ein eCl@ss-Klartext aus OXOMI wird mitgelesen, wenn er vorliegt.
 */
import type { Kapitel, Kapitelvorschlag } from './types.ts';

/**
 * eCl@ss-Schluessel -> Kapitel. Wird aus den im Testlauf gemessenen Codes
 * gefuellt, nicht geraten. Ein Praefix genuegt (z. B. "30-11-05").
 */
export const ECLASS_KAPITEL: ReadonlyArray<{ praefix: string; kapitel: Kapitel }> = [];

/**
 * Stichworte aus der Sprache des Sortiments. Laengster Treffer gewinnt, damit
 * "Waschtischarmatur" bei der Waschtischanlage landet und nicht bei einem
 * allgemeinen Armaturen-Stichwort.
 */
const STICHWORTE: ReadonlyArray<{ wort: string; kapitel: Kapitel }> = [
  // Unterputztechnik zuerst gedacht, gewinnt aber ohnehin ueber die Wortlaenge
  { wort: 'unterputz', kapitel: 'Unterputztechnik' },
  { wort: 'up-koerper', kapitel: 'Unterputztechnik' },
  { wort: 'up-körper', kapitel: 'Unterputztechnik' },
  { wort: 'grundkoerper', kapitel: 'Unterputztechnik' },
  { wort: 'grundkörper', kapitel: 'Unterputztechnik' },
  { wort: 'funktionseinheit', kapitel: 'Unterputztechnik' },
  { wort: 'spuelkasten', kapitel: 'Unterputztechnik' },
  { wort: 'spülkasten', kapitel: 'Unterputztechnik' },
  { wort: 'vorwandelement', kapitel: 'Unterputztechnik' },
  { wort: 'installationselement', kapitel: 'Unterputztechnik' },
  { wort: 'montageelement', kapitel: 'Unterputztechnik' },
  { wort: 'wandeinbau', kapitel: 'Unterputztechnik' },

  // Waschtischanlage
  { wort: 'waschtischunterschrank', kapitel: 'Waschtischanlage' },
  { wort: 'waschtischarmatur', kapitel: 'Waschtischanlage' },
  { wort: 'waschtischbefestigung', kapitel: 'Waschtischanlage' },
  { wort: 'waschtisch', kapitel: 'Waschtischanlage' },
  { wort: 'waschbecken', kapitel: 'Waschtischanlage' },
  { wort: 'handwaschbecken', kapitel: 'Waschtischanlage' },
  { wort: 'wt-unterschrank', kapitel: 'Waschtischanlage' },
  { wort: 'wt-anlage', kapitel: 'Waschtischanlage' },
  { wort: 'wtu', kapitel: 'Waschtischanlage' },
  { wort: 'aufsatzbecken', kapitel: 'Waschtischanlage' },
  { wort: 'aufsatzschale', kapitel: 'Waschtischanlage' },
  { wort: 'spiegelschrank', kapitel: 'Waschtischanlage' },
  { wort: 'lichtspiegel', kapitel: 'Waschtischanlage' },

  // WC-Anlage
  { wort: 'tiefspuel', kapitel: 'WC-Anlage' },
  { wort: 'tiefspül', kapitel: 'WC-Anlage' },
  { wort: 'flachspuel', kapitel: 'WC-Anlage' },
  { wort: 'wc-sitz', kapitel: 'WC-Anlage' },
  { wort: 'wc-anlage', kapitel: 'WC-Anlage' },
  { wort: 'dusch-wc', kapitel: 'WC-Anlage' },
  { wort: 'klosett', kapitel: 'WC-Anlage' },
  { wort: 'betaetigungsplatte', kapitel: 'WC-Anlage' },
  { wort: 'betätigungsplatte', kapitel: 'WC-Anlage' },
  { wort: 'wc', kapitel: 'WC-Anlage' },

  // Urinal
  { wort: 'urinal', kapitel: 'Urinal' },

  // Wannenanlage
  { wort: 'badewanne', kapitel: 'Wannenanlage' },
  { wort: 'wannentraeger', kapitel: 'Wannenanlage' },
  { wort: 'wannenträger', kapitel: 'Wannenanlage' },
  { wort: 'wannenarmatur', kapitel: 'Wannenanlage' },
  { wort: 'wannenrand', kapitel: 'Wannenanlage' },
  { wort: 'whirlpool', kapitel: 'Wannenanlage' },
  { wort: 'wanne', kapitel: 'Wannenanlage' },

  // Duschanlage
  { wort: 'duschabtrennung', kapitel: 'Duschanlage' },
  { wort: 'duschwanne', kapitel: 'Duschanlage' },
  { wort: 'duschrinne', kapitel: 'Duschanlage' },
  { wort: 'duscharmatur', kapitel: 'Duschanlage' },
  { wort: 'duschsystem', kapitel: 'Duschanlage' },
  { wort: 'duschkabine', kapitel: 'Duschanlage' },
  { wort: 'kopfbrause', kapitel: 'Duschanlage' },
  { wort: 'handbrause', kapitel: 'Duschanlage' },
  { wort: 'brausestange', kapitel: 'Duschanlage' },
  { wort: 'brauseset', kapitel: 'Duschanlage' },
  { wort: 'walk-in', kapitel: 'Duschanlage' },
  { wort: 'dusche', kapitel: 'Duschanlage' },

  // Ausstattungsgegenstaende
  { wort: 'handtuchhalter', kapitel: 'Ausstattungsgegenstaende' },
  { wort: 'handtuchring', kapitel: 'Ausstattungsgegenstaende' },
  { wort: 'seifenspender', kapitel: 'Ausstattungsgegenstaende' },
  { wort: 'papierhalter', kapitel: 'Ausstattungsgegenstaende' },
  { wort: 'buerstengarnitur', kapitel: 'Ausstattungsgegenstaende' },
  { wort: 'bürstengarnitur', kapitel: 'Ausstattungsgegenstaende' },
  { wort: 'haltegriff', kapitel: 'Ausstattungsgegenstaende' },
  { wort: 'ablage', kapitel: 'Ausstattungsgegenstaende' },
  { wort: 'accessoire', kapitel: 'Ausstattungsgegenstaende' },

  // Waermequellen
  { wort: 'badheizkoerper', kapitel: 'Waermequellen' },
  { wort: 'badheizkörper', kapitel: 'Waermequellen' },
  { wort: 'handtuchheizkoerper', kapitel: 'Waermequellen' },
  { wort: 'heizkoerper', kapitel: 'Waermequellen' },
  { wort: 'heizkörper', kapitel: 'Waermequellen' },
  { wort: 'heizstab', kapitel: 'Waermequellen' },
  { wort: 'radiator', kapitel: 'Waermequellen' },
];

function normalisiere(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Vorschlag aus eCl@ss-Code, eCl@ss-Klartext und Artikelbezeichnung.
 * Der eCl@ss-Code hat Vorrang, sobald die Tabelle gefuellt ist.
 */
export function schlageKapitelVor(eingabe: {
  eclassCode?: string | null;
  eclassBezeichnung?: string | null;
  bezeichnung?: string | null;
}): Kapitelvorschlag {
  const code = (eingabe.eclassCode ?? '').trim();
  if (code) {
    const treffer = ECLASS_KAPITEL.find((e) => code.startsWith(e.praefix));
    if (treffer) {
      return { kapitel: treffer.kapitel, grundlage: 'eclass', beleg: treffer.praefix };
    }
  }

  const text = normalisiere(`${eingabe.bezeichnung ?? ''} ${eingabe.eclassBezeichnung ?? ''}`);
  if (text.trim() === '') return { kapitel: null, grundlage: 'kein_vorschlag' };

  let bester: { wort: string; kapitel: Kapitel } | null = null;
  for (const eintrag of STICHWORTE) {
    if (!text.includes(eintrag.wort)) continue;
    if (!bester || eintrag.wort.length > bester.wort.length) bester = eintrag;
  }

  if (!bester) return { kapitel: null, grundlage: 'kein_vorschlag' };
  return { kapitel: bester.kapitel, grundlage: 'bezeichnung', beleg: bester.wort };
}
