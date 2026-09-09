/**
 * Grundregel 1 aus UEBERGABE.md Abschnitt 2: Preise existieren nirgends im
 * System, in keinem Log, in keiner Mappe.
 *
 * Die Regel gilt nicht nur fuer den SAP-Import. Auch OXOMI kann Preisangaben
 * mitliefern. Dieses Modul ist der eine Ort, an dem entschieden wird, ob ein
 * Feld ein Preisfeld ist - benutzt von der Anreicherung und von der
 * Diagnoseanzeige.
 */

/** Stichworte, die schon als Wortbestandteil auf einen Preis hindeuten. */
const PREIS_TEILWORT = [
  'preis',
  'brutto',
  'netto',
  'rabatt',
  'kondition',
  'waehrung',
  'währung',
  'currency',
  'price',
  'pricing',
  'discount',
  'amount',
  'betrag',
  'summe',
  'kosten',
  'skonto',
  'entgelt',
  'mwst',
  'uvp',
  'rrp',
  'msrp',
];

/**
 * Stichworte, die nur als eigenstaendiges Wort zaehlen. Als Wortbestandteil
 * stecken sie in voellig harmlosen Merkmalen ("Steuerung", "Messwert",
 * "Netzwerk"), die eine Mappe braucht.
 */
const PREIS_GANZWORT = [
  'wert',
  'werte',
  'ek',
  'vk',
  'net',
  'gross',
  'total',
  'cost',
  'tax',
  'vat',
  'steuer',
];

/**
 * Ausnahmen: Felder, die ein Preis-Stichwort enthalten, aber fachlich keine
 * Preisangabe sind. Sonst faellt z. B. "Nettogewicht" faelschlich unter die Sperre.
 */
const KEINE_PREISFELDER = [
  'nettogewicht',
  'bruttogewicht',
  'nettoinhalt',
  'bruttoinhalt',
  'nettovolumen',
  'bruttovolumen',
  'networkweight',
  'netweight',
  'grossweight',
];

function kompakt(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Ist dieser Feld- oder Merkmalsname ein Preis- oder Konditionsfeld?
 * Im Zweifel ja - lieber eine Faktenangabe zu wenig als ein Preis zu viel.
 */
export function istPreisFeld(name: string): boolean {
  if (!name) return false;
  const k = kompakt(name);
  if (!k) return false;

  for (const ausnahme of KEINE_PREISFELDER) {
    if (k.includes(kompakt(ausnahme))) return false;
  }

  for (const stichwort of PREIS_TEILWORT) {
    if (k.includes(kompakt(stichwort))) return true;
  }

  const woerter = name.toLowerCase().split(/[^a-zäöüß0-9]+/i).filter(Boolean);
  for (const stichwort of PREIS_GANZWORT) {
    if (woerter.includes(stichwort)) return true;
  }

  return false;
}

/** Felder, deren Inhalt selbst der Merkmalsname ist (Name/Wert-Paare). */
const NAMENSFELDER = ['name', 'label', 'bezeichnung', 'key', 'schluessel', 'titel', 'title', 'caption'];
/** Felder, die in einem Name/Wert-Paar den Wert tragen. */
const WERTFELDER = ['value', 'wert', 'val', 'content', 'inhalt', 'text'];

const ERSATZ = '[Preisfeld verworfen]';

/**
 * Entfernt aus einer beliebigen JSON-Struktur alle Preisangaben, bevor
 * irgendetwas gespeichert oder angezeigt wird. Greift zweifach:
 * ueber den Feldnamen selbst und ueber Name/Wert-Paare, bei denen der
 * Preisbezug erst im Namensfeld steht.
 */
export function entfernePreisfelder<T>(wert: T, tiefe = 0): T {
  if (tiefe > 14 || wert === null || wert === undefined) return wert;

  if (Array.isArray(wert)) {
    return wert.map((e) => entfernePreisfelder(e, tiefe + 1)) as unknown as T;
  }

  if (typeof wert === 'object') {
    const eintraege = Object.entries(wert as Record<string, unknown>);

    // Name/Wert-Paar, dessen Name auf einen Preis zeigt? Dann faellt der Wert.
    const namensEintrag = eintraege.find(
      ([s, i]) => NAMENSFELDER.includes(s.toLowerCase()) && typeof i === 'string',
    );
    const istPreisPaar = namensEintrag ? istPreisFeld(namensEintrag[1] as string) : false;

    const ergebnis: Record<string, unknown> = {};
    for (const [schluessel, inhalt] of eintraege) {
      if (istPreisFeld(schluessel)) {
        ergebnis[schluessel] = ERSATZ;
      } else if (istPreisPaar && WERTFELDER.includes(schluessel.toLowerCase())) {
        ergebnis[schluessel] = ERSATZ;
      } else {
        ergebnis[schluessel] = entfernePreisfelder(inhalt, tiefe + 1);
      }
    }
    return ergebnis as unknown as T;
  }

  return wert;
}
