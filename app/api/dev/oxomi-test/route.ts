/**
 * Dieselbe Pruefung wie /dev/oxomi-test, aber als JSON.
 * Gedacht fuer die Auswertung im Entwicklungslauf. Gleicher Schutz.
 */
import { NextResponse } from 'next/server';
import { pruefeSchluessel } from '@/lib/dev/schutz';
import { fuehrePruefungAus } from '@/lib/dev/oxomi-pruefung';
import { kalibriere } from '@/lib/oxomi';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(anfrage: Request) {
  const url = new URL(anfrage.url);
  const schutz = pruefeSchluessel(url.searchParams.get('key'));
  if (!schutz.erlaubt) {
    return NextResponse.json({ fehler: schutz.grund }, { status: schutz.httpStatus });
  }

  if (url.searchParams.get('modus') === 'kalibrieren') {
    const tagesOffset = Number(url.searchParams.get('tage') ?? '1');
    try {
      const ergebnis = await kalibriere(
        {
          hersteller: 'hansgrohe',
          werksnummer: '60133450',
          pietschNr: '054107001',
          ean: '4059625478899',
        },
        Number.isFinite(tagesOffset) ? tagesOffset : 1,
      );
      return NextResponse.json(ergebnis);
    } catch (fehler) {
      return NextResponse.json(
        { fehler: fehler instanceof Error ? fehler.message : String(fehler) },
        { status: 500 },
      );
    }
  }

  const stand = await fuehrePruefungAus({
    cacheUmgehen: url.searchParams.get('frisch') === '1',
    mitDiagnose: url.searchParams.get('diagnose') === '1',
  });

  return NextResponse.json(stand);
}
