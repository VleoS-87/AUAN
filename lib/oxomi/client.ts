/**
 * Getippte Aufrufe gegen die OXOMI-Schnittstelle.
 *
 * Nur diese Datei kennt Adressen, Parameter und Antwortformen. Der Rest des
 * Bausteins arbeitet mit AUAN-Typen.
 */
import type { OxomiKonfiguration } from './config.ts';
import { Drossel, rufeAuf, type AufrufErgebnis } from './http.ts';
import { entfernePreisfelder } from './preissperre.ts';
import { baueZugangsparameter, type Zugangsparameter } from './token.ts';
import {
  GTIN_AUFLOESEN,
  PRODUKTDATEN_V2,
  baueAbfragen,
  type GtinAntwort,
  type OxomiProdukt,
  type ProduktdatenAntwort,
} from './endpunkte.ts';
import type { OxomiKennung } from './types.ts';

export interface ClientUmgebung {
  konfiguration: OxomiKonfiguration;
  drossel: Drossel;
  jetzt?: () => number;
}

export interface AufrufSpur {
  /** Angefragte Adresse; Token, Portal und Benutzer sind ersetzt. */
  urlOhneGeheimnis: string;
  httpStatus?: number;
  dauerMs: number;
  fehler?: string;
  /** Gekuerzte, preisbereinigte Antwort. Nur fuer die Diagnose. */
  antwortAuszug?: string;
}

export interface GtinErgebnis {
  kennung: OxomiKennung | null;
  spur: AufrufSpur;
  /** Technische Stoerung (kein Aussage ueber den Artikel). */
  stoerung?: string;
}

export interface ProduktErgebnis {
  produkt: OxomiProdukt | null;
  /** Preisbereinigte Rohantwort - Grundlage der Auswertung. */
  rumpf: ProduktdatenAntwort | null;
  spur: AufrufSpur;
  stoerung?: string;
}

const AUSZUG = 1200;

/** Löst eine EAN/GTIN in die OXOMI-Kennung auf. Der sicherste Weg zum Artikel. */
export async function loeseGtinAuf(ean: string, umgebung: ClientUmgebung): Promise<GtinErgebnis> {
  const zugang = zugangsparameter(umgebung);
  const url = baueUrl(umgebung.konfiguration.basisUrl, GTIN_AUFLOESEN, {
    ...alsParameter(zugang),
    gtin: ean.trim(),
  });

  const ergebnis = await rufeAuf(url, umgebung.konfiguration, umgebung.drossel);
  const spur = baueSpur(url, ergebnis);

  if (!ergebnis.ok) return { kennung: null, spur, stoerung: ergebnis.fehler };

  const antwort = ergebnis.koerper as GtinAntwort | undefined;
  if (!antwort || antwort.error) {
    return { kennung: null, spur, stoerung: antwort?.message };
  }
  if (!antwort.resolved || !antwort.supplierNumber || !antwort.supplierItemNumber) {
    return { kennung: null, spur };
  }

  return {
    kennung: {
      supplierNumber: antwort.supplierNumber,
      supplierItemNumber: antwort.supplierItemNumber,
    },
    spur,
  };
}

/** Holt Bilder, Texte und Anhaenge zu einer bekannten OXOMI-Kennung. */
export async function holeProduktdaten(
  kennung: OxomiKennung,
  umgebung: ClientUmgebung,
  maxBilder = 12,
): Promise<ProduktErgebnis> {
  const zugang = zugangsparameter(umgebung);
  const url = baueUrl(umgebung.konfiguration.basisUrl, PRODUKTDATEN_V2, {
    ...alsParameter(zugang),
    language: 'de',
  });

  const ergebnis = await rufeAuf(url, umgebung.konfiguration, umgebung.drossel, {
    methode: 'POST',
    koerper: {
      outputMode: 'normal',
      queries: baueAbfragen(maxBilder),
      products: [
        { itemNumber: kennung.supplierItemNumber, supplierNumber: kennung.supplierNumber },
      ],
    },
  });

  const spur = baueSpur(url, ergebnis);
  if (!ergebnis.ok) return { produkt: null, rumpf: null, spur, stoerung: ergebnis.fehler };

  // Grundregel 1: Die Antwort wird preisbereinigt, bevor irgendetwas damit
  // geschieht - vor der Auswertung, vor dem Cache, vor jeder Anzeige.
  const rumpf = entfernePreisfelder(ergebnis.koerper) as ProduktdatenAntwort | undefined;
  if (!rumpf || rumpf.error) {
    return { produkt: null, rumpf: null, spur, stoerung: rumpf?.message };
  }

  return { produkt: rumpf.products?.[0] ?? null, rumpf, spur };
}

// ---------------------------------------------------------------------------

function zugangsparameter(umgebung: ClientUmgebung): Zugangsparameter {
  const jetzt = umgebung.jetzt ?? Date.now;
  return baueZugangsparameter(umgebung.konfiguration, jetzt());
}

function alsParameter(zugang: Zugangsparameter): Record<string, string> {
  const parameter: Record<string, string> = {
    portal: zugang.portal,
    user: zugang.user,
    accessToken: zugang.accessToken,
  };
  if (zugang.roles) parameter.roles = zugang.roles;
  return parameter;
}

export function baueUrl(basisUrl: string, pfad: string, params: Record<string, string>): string {
  const url = new URL(pfad, basisUrl.endsWith('/') ? basisUrl : `${basisUrl}/`);
  for (const [name, wert] of Object.entries(params)) url.searchParams.set(name, wert);
  return url.toString();
}

/**
 * Ersetzt in einer Adresse alles, was zu den Zugangsdaten gehoert: Token,
 * Portal-Kennung und technischen Benutzer.
 */
export function ohneGeheimnis(url: string): string {
  return url
    .replace(/(accessToken=)[^&]*/gi, '$1***')
    .replace(/(portal=)[^&]*/gi, '$1***')
    .replace(/(user=)[^&]*/gi, '$1***');
}

function baueSpur(url: string, ergebnis: AufrufErgebnis): AufrufSpur {
  let auszug: string | undefined;
  if (ergebnis.koerper !== undefined) {
    try {
      auszug = JSON.stringify(entfernePreisfelder(ergebnis.koerper)).slice(0, AUSZUG);
    } catch {
      auszug = undefined;
    }
  }
  return {
    urlOhneGeheimnis: ohneGeheimnis(url),
    httpStatus: ergebnis.httpStatus,
    dauerMs: ergebnis.dauerMs,
    fehler: ergebnis.fehler,
    antwortAuszug: auszug,
  };
}
