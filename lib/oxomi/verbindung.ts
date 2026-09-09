/**
 * Verbindungspruefung: Kommt AUAN gerade an OXOMI heran?
 *
 * Loest eine bekannte EAN aus der Testliste auf. Das prueft in einem Schritt
 * Erreichbarkeit, Anmeldung und Sortimentszugriff. Gibt niemals Zugangsdaten aus.
 */
import { ladeKonfiguration, fehlendeZugangsdaten } from './config.ts';
import { Drossel } from './http.ts';
import { loeseGtinAuf, type AufrufSpur } from './client.ts';

export interface Verbindungsbericht {
  erreichbar: boolean;
  angemeldet: boolean;
  /** Kurze Einordnung in Alltagssprache. */
  befund: string;
  spur?: AufrufSpur;
}

/** EAN des Geberit-Waschtischs aus testdaten/artikel/artikel_testliste.csv. */
const PRUEF_EAN = '4025410858368';

export async function pruefeVerbindung(ean: string = PRUEF_EAN): Promise<Verbindungsbericht> {
  const fehlt = fehlendeZugangsdaten();
  if (fehlt.length > 0) {
    return {
      erreichbar: false,
      angemeldet: false,
      befund: `Zugangsdaten unvollstaendig: ${fehlt.join(', ')}. Es wurde nicht angefragt.`,
    };
  }

  const konfiguration = ladeKonfiguration();
  const drossel = new Drossel(1, 0);
  const ergebnis = await loeseGtinAuf(ean, { konfiguration, drossel });

  if (ergebnis.spur.httpStatus === undefined) {
    return {
      erreichbar: false,
      angemeldet: false,
      befund: `OXOMI war nicht erreichbar: ${ergebnis.spur.fehler ?? 'keine Antwort'}`,
      spur: ergebnis.spur,
    };
  }

  if (ergebnis.spur.httpStatus === 401) {
    return {
      erreichbar: true,
      angemeldet: false,
      befund: 'OXOMI antwortet, weist die Anmeldung aber zurueck.',
      spur: ergebnis.spur,
    };
  }

  if (ergebnis.kennung) {
    return {
      erreichbar: true,
      angemeldet: true,
      befund: `Verbindung steht. Die Pruef-EAN wurde aufgeloest (Lieferant ${ergebnis.kennung.supplierNumber}).`,
      spur: ergebnis.spur,
    };
  }

  return {
    erreichbar: true,
    angemeldet: true,
    befund: 'Verbindung und Anmeldung stehen, die Pruef-EAN ist im Portal aber unbekannt.',
    spur: ergebnis.spur,
  };
}
