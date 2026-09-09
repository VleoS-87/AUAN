/**
 * Migrationslauf. Wird ueber die geschuetzte Route /api/dev/migrate angestossen,
 * weil in der Cloud-Arbeitsweise kein lokaler Datenbankzugang existiert.
 */
import { sql } from './client.ts';
import { MIGRATIONEN } from './migrations/index.ts';

export interface MigrationsErgebnis {
  angewendet: string[];
  uebersprungen: string[];
  fehler?: string;
}

const TABELLE = `CREATE TABLE IF NOT EXISTS schema_migration (
  id           text PRIMARY KEY,
  angewendet_am timestamptz NOT NULL DEFAULT now()
)`;

export async function fuehreMigrationenAus(): Promise<MigrationsErgebnis> {
  const db = sql();
  const angewendet: string[] = [];
  const uebersprungen: string[] = [];

  try {
    await db.query(TABELLE);
    const vorhanden = (await db.query('SELECT id FROM schema_migration')) as Array<{ id: string }>;
    const bekannt = new Set(vorhanden.map((z) => z.id));

    for (const migration of MIGRATIONEN) {
      if (bekannt.has(migration.id)) {
        uebersprungen.push(migration.id);
        continue;
      }
      for (const anweisung of migration.anweisungen) {
        await db.query(anweisung);
      }
      await db.query('INSERT INTO schema_migration (id) VALUES ($1) ON CONFLICT DO NOTHING', [
        migration.id,
      ]);
      angewendet.push(migration.id);
    }

    return { angewendet, uebersprungen };
  } catch (fehler) {
    return {
      angewendet,
      uebersprungen,
      fehler: fehler instanceof Error ? fehler.message : String(fehler),
    };
  }
}
