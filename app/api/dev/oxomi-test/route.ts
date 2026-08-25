/**
 * Dieselbe Pruefung wie /dev/oxomi-test, aber als JSON.
 * Gedacht fuer die Auswertung im Entwicklungslauf. Gleicher Schutz.
 */
import { NextResponse } from 'next/server';
import { pruefeSchluessel } from '@/lib/dev/schutz';
import { fuehrePruefungAus } from '@/lib/dev/oxomi-pruefung';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(anfrage: Request) {
  const url = new URL(anfrage.url);
  const schutz = pruefeSchluessel(url.searchParams.get('key'));
  if (!schutz.erlaubt) {
    return NextResponse.json({ fehler: schutz.grund }, { status: schutz.httpStatus });
  }

  const stand = await fuehrePruefungAus({
    cacheUmgehen: url.searchParams.get('frisch') === '1',
    mitDiagnose: url.searchParams.get('diagnose') === '1',
  });

  return NextResponse.json(stand);
}
