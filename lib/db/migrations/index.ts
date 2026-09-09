/**
 * Versionierte Migrationen.
 *
 * Bewusst als TypeScript-Dateien mit eingebettetem SQL statt als lose
 * .sql-Dateien: So sind sie im Repo versioniert UND laufen in der
 * Serverless-Umgebung ohne Dateizugriff. Jede Migration ist idempotent,
 * damit ein zweiter Lauf nichts kaputt macht.
 */
import { migration0001 } from './0001_artikel_cache.ts';
import { migration0002 } from './0002_oxomi_lieferant.ts';
import { migration0003 } from './0003_klassifikation.ts';

export interface Migration {
  id: string;
  beschreibung: string;
  anweisungen: string[];
}

export const MIGRATIONEN: ReadonlyArray<Migration> = [migration0001, migration0002, migration0003];
