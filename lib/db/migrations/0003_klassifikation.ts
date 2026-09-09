import type { Migration } from './index.ts';

/**
 * Die Spalte hiess eclass_code, weil das Fachkonzept an dieser Stelle eCl@ss
 * nennt. Gemessen liefert das Portal das ETIM-Schema (Klassen EC…), von OXOMI
 * als "metaclass" gefuehrt. Der Name wird deshalb richtiggestellt und das
 * Klassifikationssystem als eigene Spalte mitgefuehrt - damit bleibt lesbar,
 * aus welchem System ein Schluessel stammt, falls spaeter ein zweites dazukommt.
 */
export const migration0003: Migration = {
  id: '0003_klassifikation',
  beschreibung: 'Klassifikationsspalten richtigstellen',
  anweisungen: [
    // Der Rename laeuft nur, wenn die alte Spalte noch da ist - so bleibt die
    // Migration auch bei einem zweiten Lauf harmlos.
    `DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
           WHERE table_name = 'artikel_cache' AND column_name = 'eclass_code'
        ) THEN
          ALTER TABLE artikel_cache RENAME COLUMN eclass_code TO klassifikation_code;
        END IF;
      END
    $$`,
    `ALTER TABLE artikel_cache ADD COLUMN IF NOT EXISTS klassifikation_system text`,
    `CREATE INDEX IF NOT EXISTS artikel_cache_klassifikation_idx
       ON artikel_cache (klassifikation_code) WHERE klassifikation_code IS NOT NULL`,
  ],
};
