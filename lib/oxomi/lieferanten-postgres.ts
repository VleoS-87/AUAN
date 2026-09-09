/**
 * Postgres-Umsetzung der Lieferanten-Zuordnung.
 *
 * Nur diese Datei kennt die Tabelle oxomi_lieferant. Der Rest des Bausteins
 * spricht ausschliesslich gegen das Interface aus lieferanten.ts.
 */
import { sql } from '../db/client.ts';
import {
  herstellerSchluessel,
  type LieferantZuordnung,
  type LieferantenSpeicher,
} from './lieferanten.ts';

interface Zeile {
  hersteller: string;
  supplier_number: string;
  belege: number;
}

export function postgresLieferanten(): LieferantenSpeicher {
  const db = sql();

  return {
    async finde(hersteller: string): Promise<LieferantZuordnung | null> {
      const schluessel = herstellerSchluessel(hersteller);
      if (schluessel.length === 0) return null;

      const zeilen = (await db.query(
        `SELECT hersteller, supplier_number, belege
           FROM oxomi_lieferant
          WHERE hersteller = ANY($1)
          ORDER BY belege DESC
          LIMIT 1`,
        [schluessel],
      )) as Zeile[];

      const zeile = zeilen[0];
      return zeile
        ? { hersteller: zeile.hersteller, supplierNumber: zeile.supplier_number, belege: zeile.belege }
        : null;
    },

    async merke(hersteller: string, supplierNumber: string): Promise<void> {
      for (const schluessel of herstellerSchluessel(hersteller)) {
        await db.query(
          `INSERT INTO oxomi_lieferant (hersteller, supplier_number, belege, gelernt_am)
             VALUES ($1, $2, 1, now())
           ON CONFLICT (hersteller) DO UPDATE SET
             belege = CASE
               WHEN oxomi_lieferant.supplier_number = EXCLUDED.supplier_number
               THEN oxomi_lieferant.belege + 1
               ELSE 1
             END,
             supplier_number = EXCLUDED.supplier_number,
             gelernt_am = now()`,
          [schluessel, supplierNumber],
        );
      }
    },

    async alle(): Promise<LieferantZuordnung[]> {
      const zeilen = (await db.query(
        'SELECT hersteller, supplier_number, belege FROM oxomi_lieferant ORDER BY hersteller',
      )) as Zeile[];
      return zeilen.map((z) => ({
        hersteller: z.hersteller,
        supplierNumber: z.supplier_number,
        belege: z.belege,
      }));
    },
  };
}
