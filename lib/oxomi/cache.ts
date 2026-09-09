/**
 * Artikel-Cache.
 *
 * Pflicht laut UEBERGABE.md Abschnitt 5: Jedes Anreicherungsergebnis wird
 * dauerhaft gespeichert und wiederverwendet. OXOMI wird nur fuer unbekannte
 * Artikel oder beim Aktualisierungslauf gerufen.
 *
 * Der Cache haengt nicht an einer bestimmten Datenbank: Das Modul spricht nur
 * gegen das Interface ArtikelCacheSpeicher. Fuer AUAN gibt es die
 * Postgres-Umsetzung, fuer Tests eine im Arbeitsspeicher.
 */
import type { ArtikelDaten, ArtikelSchluessel } from './types.ts';

export interface CacheEintrag {
  daten: ArtikelDaten;
  stand: Date;
}

export interface ArtikelCacheSpeicher {
  lesen(schluessel: ArtikelSchluessel): Promise<CacheEintrag | null>;
  schreiben(daten: ArtikelDaten): Promise<void>;
  /** Nur fuer Auswertung und Tests. */
  anzahl?(): Promise<number>;
}

// -------------------------------------------------------------------------
// Schluesselbildung
// -------------------------------------------------------------------------

export function normalisiereHersteller(wert: string | null | undefined): string | null {
  const t = (wert ?? '').trim().toLowerCase();
  if (!t) return null;
  return t.replace(/[^a-z0-9]+/g, '') || null;
}

export function normalisiereNummer(wert: string | null | undefined): string | null {
  const t = (wert ?? '').trim().toUpperCase();
  if (!t) return null;
  return t.replace(/\s+/g, '') || null;
}

/**
 * Eindeutiger Schluessel eines Artikels. Reihenfolge entspricht der
 * Matching-Kaskade: Hersteller + Werksnummer ist der sicherste Schluessel.
 */
export function bildeCacheSchluessel(schluessel: ArtikelSchluessel): string {
  const her = normalisiereHersteller(schluessel.hersteller);
  const werk = normalisiereNummer(schluessel.werksnummer);
  const nr = normalisiereNummer(schluessel.pietschNr);
  const ean = normalisiereNummer(schluessel.ean);

  if (her && werk) return `hw:${her}|${werk}`;
  if (werk) return `w:${werk}`;
  if (nr) return `p:${nr}`;
  if (ean) return `e:${ean}`;
  return 'unbestimmt';
}

// -------------------------------------------------------------------------
// Umsetzung im Arbeitsspeicher (Tests, und wenn keine Datenbank da ist)
// -------------------------------------------------------------------------

export function speicherCache(): ArtikelCacheSpeicher {
  const ablage = new Map<string, CacheEintrag>();

  return {
    async lesen(schluessel) {
      return ablage.get(bildeCacheSchluessel(schluessel)) ?? null;
    },
    async schreiben(daten) {
      ablage.set(daten.cacheSchluessel, { daten, stand: new Date(daten.stand) });
    },
    async anzahl() {
      return ablage.size;
    },
  };
}
