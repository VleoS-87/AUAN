import type { Migration } from './index';

/**
 * Artikel-Cache laut UEBERGABE.md Abschnitt 5 und 6.
 *
 * Ein Eintrag je Artikel. Die vollstaendigen Anreicherungsdaten liegen als
 * JSON in `daten`; die haeufig gesuchten Schluessel stehen zusaetzlich als
 * eigene Spalten, damit die Matching-Kaskade sie ueber einen Index findet.
 *
 * `daten` enthaelt nie Preise: Die Antwort wird vor dem Speichern durch die
 * Preissperre gefuehrt (Grundregel 1).
 */
export const migration0001: Migration = {
  id: '0001_artikel_cache',
  beschreibung: 'Artikel-Cache anlegen',
  anweisungen: [
    `CREATE TABLE IF NOT EXISTS artikel_cache (
      cache_schluessel  text PRIMARY KEY,
      pietsch_nr        text,
      hersteller        text,
      werksnummer       text,
      ean               text,
      status            text NOT NULL,
      bezeichnung       text,
      serie             text,
      eclass_code       text,
      kapitel_vorschlag text,
      quelle            text NOT NULL,
      suchweg           text,
      anzahl_bilder     integer NOT NULL DEFAULT 0,
      anzahl_fakten     integer NOT NULL DEFAULT 0,
      daten             jsonb  NOT NULL,
      stand             timestamptz NOT NULL DEFAULT now(),
      aktualisiert_am   timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS artikel_cache_pietsch_nr_idx
       ON artikel_cache (pietsch_nr) WHERE pietsch_nr IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS artikel_cache_werksnummer_idx
       ON artikel_cache (werksnummer) WHERE werksnummer IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS artikel_cache_ean_idx
       ON artikel_cache (ean) WHERE ean IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS artikel_cache_stand_idx ON artikel_cache (stand)`,
  ],
};
