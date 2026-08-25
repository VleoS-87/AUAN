/**
 * Kapitelvorschlag je Artikel.
 *
 * Grundlage laut UEBERGABE.md Abschnitt 7: die Klassifikation aus OXOMI als
 * strukturierte Basis, ergaenzt um die Bewertung der Bezeichnung. Der Vorschlag
 * ist ein Vorschlag - im Review korrigiert der Badverkaeufer ihn per Klick.
 *
 * Das Fachkonzept nennt an dieser Stelle eCl@ss. Gemessen liefert das Portal
 * das ETIM-Schema (Klassen EC…), von OXOMI als "metaclass" gefuehrt. Die
 * Zuordnung arbeitet deshalb mit ETIM-Klassenschluesseln.
 *
 * Drei Stufen, in dieser Reihenfolge:
 *   1. Klassenschluessel (z. B. EC011550). Eindeutig, sprachunabhaengig.
 *   2. Klartext der Klasse (z. B. "Waschbecken"). Traegt auch dann, wenn der
 *      Schluessel noch nicht in der Tabelle steht.
 *   3. Artikelbezeichnung aus dem Angebot. Letzter Rueckfall.
 */
import type { Kapitel, Kapitelvorschlag } from './types.ts';

/**
 * Klassenschluessel -> Kapitel. Gefuellt aus den Klassen, die der Testlauf am
 * 25.08.2026 wirklich geliefert hat - nicht aus einer Codeliste geraten.
 * Ein Praefix genuegt, damit verwandte Klassen mitlaufen.
 */
export const KLASSE_KAPITEL: ReadonlyArray<{ code: string; kapitel: Kapitel; bezeichnung: string }> = [
  { code: 'EC011550', kapitel: 'Waschtischanlage', bezeichnung: 'Waschbecken' },
  { code: 'EC011382', kapitel: 'Waschtischanlage', bezeichnung: 'Waschtischunterschrank' },
  { code: 'EC011289', kapitel: 'WC-Anlage', bezeichnung: 'WC' },
];

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
  { wort: 'waschbecken', kapitel: 'Waschtischanlage' },
  { wort: 'handwaschbecken', kapitel: 'Waschtischanlage' },
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
  klassifikationCode?: string | null;
  klassifikationBezeichnung?: string | null;
  bezeichnung?: string | null;
}): Kapitelvorschlag {
  // 1. Klassenschluessel - eindeutig und sprachunabhaengig.
  const code = (eingabe.klassifikationCode ?? '').trim().toUpperCase();
  if (code) {
    const treffer = KLASSE_KAPITEL.find((e) => code.startsWith(e.code));
    if (treffer) {
      return { kapitel: treffer.kapitel, grundlage: 'klassifikation', beleg: treffer.code };
    }
  }

  // 2. Klartext der Klasse - traegt auch bei noch unbekanntem Schluessel.
  const klassenname = (eingabe.klassifikationBezeichnung ?? '').trim();
  if (klassenname) {
    const treffer = findeStichwort(klassenname);
    if (treffer) {
      return { kapitel: treffer.kapitel, grundlage: 'klassenname', beleg: klassenname };
    }
  }

  // 3. Artikelbezeichnung aus dem Angebot.
  const bezeichnung = (eingabe.bezeichnung ?? '').trim();
  if (bezeichnung) {
    const treffer = findeStichwort(bezeichnung);
    if (treffer) {
      return { kapitel: treffer.kapitel, grundlage: 'bezeichnung', beleg: treffer.wort };
    }
  }

  return { kapitel: null, grundlage: 'kein_vorschlag' };
}

/** Laengster passender Stichworttreffer in einem Text. */
function findeStichwort(text: string): { wort: string; kapitel: Kapitel } | null {
  const gesucht = normalisiere(text);
  let bester: { wort: string; kapitel: Kapitel } | null = null;
  for (const eintrag of STICHWORTE) {
    if (!gesucht.includes(eintrag.wort)) continue;
    if (!bester || eintrag.wort.length > bester.wort.length) bester = eintrag;
  }
  return bester;
}
