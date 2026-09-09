import type { Migration } from './index.ts';

/**
 * Gelernte Zuordnung Herstellername -> OXOMI-Lieferantennummer.
 *
 * OXOMI erwartet in der Produktauskunft seine eigene Lieferantennummer, der
 * SAP-Export kennt nur einen Herstellernamen. Jede erfolgreiche EAN-Aufloesung
 * verraet die Nummer; sie wird hier gemerkt und steht danach allen Ausstellungen
 * zur Verfuegung. Das ist die Kaskadenstufe 2 aus UEBERGABE.md Abschnitt 7.
 */
export const migration0002: Migration = {
  id: '0002_oxomi_lieferant',
  beschreibung: 'Zuordnung Hersteller zu OXOMI-Lieferantennummer anlegen',
  anweisungen: [
    `CREATE TABLE IF NOT EXISTS oxomi_lieferant (
      hersteller      text PRIMARY KEY,
      supplier_number text NOT NULL,
      belege          integer NOT NULL DEFAULT 1,
      gelernt_am      timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS oxomi_lieferant_nummer_idx ON oxomi_lieferant (supplier_number)`,
  ],
};
