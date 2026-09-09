/**
 * Zugang zur Neon-Postgres-Datenbank.
 *
 * Bewusst duenn gehalten: Es wird ausschliesslich Standard-PostgreSQL
 * gesprochen (UEBERGABE.md Abschnitt 3). Der Neon-Treiber ist nur der
 * Transportweg und laesst sich gegen einen gewoehnlichen pg-Treiber tauschen,
 * ohne dass die Abfragen sich aendern.
 */
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

export type SqlFunktion = NeonQueryFunction<false, false>;

let zwischenspeicher: SqlFunktion | null = null;

export function datenbankVerfuegbar(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.DATABASE_URL && env.DATABASE_URL.trim() !== '');
}

export function sql(env: NodeJS.ProcessEnv = process.env): SqlFunktion {
  if (!datenbankVerfuegbar(env)) {
    throw new Error('DATABASE_URL ist nicht gesetzt.');
  }
  if (!zwischenspeicher) {
    zwischenspeicher = neon(env.DATABASE_URL!);
  }
  return zwischenspeicher;
}
