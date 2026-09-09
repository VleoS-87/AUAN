/**
 * Fuehrt die versionierten Migrationen aus.
 *
 * In der Cloud-Arbeitsweise gibt es keinen lokalen Datenbankzugang; die
 * Migration wird deshalb aus dem Deployment heraus angestossen. Gleicher
 * Schutz wie die uebrigen /dev-Routen. Jede Migration ist idempotent.
 */
import { NextResponse } from 'next/server';
import { pruefeSchluessel } from '@/lib/dev/schutz';
import { datenbankVerfuegbar } from '@/lib/db/client';
import { fuehreMigrationenAus } from '@/lib/db/migrate';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(anfrage: Request) {
  const url = new URL(anfrage.url);
  const schutz = pruefeSchluessel(url.searchParams.get('key'));
  if (!schutz.erlaubt) {
    return NextResponse.json({ fehler: schutz.grund }, { status: schutz.httpStatus });
  }

  if (!datenbankVerfuegbar()) {
    return NextResponse.json({ fehler: 'DATABASE_URL ist nicht gesetzt.' }, { status: 503 });
  }

  const ergebnis = await fuehreMigrationenAus();
  return NextResponse.json(ergebnis, { status: ergebnis.fehler ? 500 : 200 });
}
