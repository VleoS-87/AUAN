/**
 * Kalibrierlauf.
 *
 * Zweck: Die oeffentliche OXOMI-Dokumentation belegt das Token-Verfahren und
 * die Parameternamen der Produktauskunft, nicht aber verbindlich den
 * Dienstpfad im Pietsch-Portal. Statt zu raten, fragt dieser Lauf das echte
 * Portal aus dem Deployment heraus und zeigt, welcher Pfad antwortet.
 *
 * Das Ergebnis wird gelesen und der bestaetigte Pfad in suchwege.ts
 * festgeschrieben. Der Lauf bleibt danach als Diagnosewerkzeug bestehen.
 *
 * Es werden nur Lesezugriffe gemacht und niemals Zugangsdaten ausgegeben.
 */
import { Drossel, rufeAuf } from './http';
import { ladeKonfiguration } from './config';
import { baueZugangsparameter } from './token';
import { entfernePreisfelder } from './preissperre';
import { KALIBRIER_PFADE } from './suchwege';
import { baueUrl, ohneGeheimnis } from './anreicherung';
import type { ArtikelSchluessel } from './types';

export interface KalibrierZeile {
  pfad: string;
  zweck: string;
  urlOhneGeheimnis: string;
  httpStatus?: number;
  dauerMs: number;
  fehler?: string;
  /** Erste Zeichen der preisbereinigten Antwort. */
  antwortAuszug?: string;
  /** Sieht die Antwort nach verwertbaren Daten aus? */
  vielversprechend: boolean;
}

export interface KalibrierErgebnis {
  expiresVariante: string;
  zeilen: KalibrierZeile[];
}

const AUSZUG = 800;

/**
 * Probiert alle dokumentierten Kandidatenpfade mit einem echten Testartikel.
 * @param tagesOffset Variante des Ablaufzeitpunkts (0 = heute, 1 = morgen).
 */
export async function kalibriere(
  testartikel: ArtikelSchluessel,
  tagesOffset = 1,
): Promise<KalibrierErgebnis> {
  const konfiguration = ladeKonfiguration();
  const drossel = new Drossel(konfiguration.maxParallel, konfiguration.mindestabstandMs);
  const zugang = baueZugangsparameter(konfiguration, Date.now(), tagesOffset);

  const suchparameter: Record<string, string> = {};
  if (testartikel.werksnummer) suchparameter.itemNumber = testartikel.werksnummer;
  else if (testartikel.pietschNr) suchparameter.itemNumber = testartikel.pietschNr;
  if (testartikel.hersteller) suchparameter.supplierNumber = testartikel.hersteller;
  if (testartikel.werksnummer) suchparameter.query = testartikel.werksnummer;

  const zeilen: KalibrierZeile[] = [];

  for (const kandidat of KALIBRIER_PFADE) {
    const url = baueUrl(konfiguration.basisUrl, kandidat.pfad, { ...zugang, ...suchparameter });
    const ergebnis = await rufeAuf(url, { ...konfiguration, maxWiederholungen: 0 }, drossel);

    const sicher = ergebnis.koerper === undefined ? undefined : entfernePreisfelder(ergebnis.koerper);
    let auszug: string | undefined;
    if (sicher !== undefined) {
      auszug = JSON.stringify(sicher).slice(0, AUSZUG);
    } else if (ergebnis.rohtext) {
      auszug = ergebnis.rohtext.replace(/\s+/g, ' ').slice(0, 300);
    }

    zeilen.push({
      pfad: kandidat.pfad,
      zweck: kandidat.zweck,
      urlOhneGeheimnis: ohneGeheimnis(url),
      httpStatus: ergebnis.httpStatus,
      dauerMs: ergebnis.dauerMs,
      fehler: ergebnis.fehler,
      antwortAuszug: auszug,
      vielversprechend: ergebnis.ok && sicher !== undefined,
    });
  }

  return { expiresVariante: `Ablauf +${tagesOffset} Tag(e)`, zeilen };
}
