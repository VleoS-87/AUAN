/**
 * Versionierte Migrationen.
 *
 * Bewusst als TypeScript-Dateien mit eingebettetem SQL statt als lose
 * .sql-Dateien: So sind sie im Repo versioniert UND laufen in der
 * Serverless-Umgebung ohne Dateizugriff. Jede Migration ist idempotent,
 * damit ein zweiter Lauf nichts kaputt macht.
 */
import { migration0001 } from './0001_artikel_cache';

export interface Migration {
  id: string;
  beschreibung: string;
  anweisungen: string[];
}

export const MIGRATIONEN: ReadonlyArray<Migration> = [migration0001];
