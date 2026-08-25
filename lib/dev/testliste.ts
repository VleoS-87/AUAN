/**
 * Liest die Artikel-Testliste aus testdaten/artikel/artikel_testliste.csv.
 *
 * Die Liste wird noch erweitert (UEBERGABE.md Abschnitt 12), deshalb wird sie
 * aus der Datei gelesen und nicht im Code doppelt gefuehrt.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ArtikelSchluessel } from '@/lib/oxomi';

export interface TestArtikel extends ArtikelSchluessel {
  bezeichnung: string;
  /** "marke" oder "eigenmarke". */
  typ: string;
  anmerkung: string;
}

export const TESTLISTE_PFAD = 'testdaten/artikel/artikel_testliste.csv';

export function ladeTestliste(): { artikel: TestArtikel[]; fehler?: string } {
  let inhalt: string;
  try {
    inhalt = readFileSync(join(process.cwd(), TESTLISTE_PFAD), 'utf8');
  } catch (fehler) {
    return {
      artikel: [],
      fehler: `Testliste ${TESTLISTE_PFAD} konnte nicht gelesen werden: ${
        fehler instanceof Error ? fehler.message : String(fehler)
      }`,
    };
  }

  const zeilen = zerlegeCsv(inhalt, ';');
  if (zeilen.length < 2) return { artikel: [], fehler: 'Testliste enthaelt keine Datenzeilen.' };

  const kopf = zeilen[0].map((s) => s.trim().toLowerCase());
  const spalte = (name: string) => kopf.indexOf(name);

  const iNr = spalte('pietsch_artikelnummer');
  const iBez = spalte('bezeichnung');
  const iWerk = spalte('werksnummer');
  const iEan = spalte('ean');
  const iMatch = spalte('matchcode');
  const iHer = spalte('hersteller');
  const iTyp = spalte('typ');
  const iAnm = spalte('anmerkung');

  const artikel: TestArtikel[] = [];
  for (const zeile of zeilen.slice(1)) {
    if (zeile.every((z) => z.trim() === '')) continue;
    const feld = (i: number) => (i >= 0 && i < zeile.length ? zeile[i].trim() : '');
    artikel.push({
      pietschNr: feld(iNr) || null,
      bezeichnung: feld(iBez),
      bezeichnungHinweis: feld(iBez) || null,
      werksnummer: feld(iWerk) || null,
      ean: feld(iEan) || null,
      matchcode: feld(iMatch) || null,
      hersteller: feld(iHer) || null,
      typ: feld(iTyp),
      anmerkung: feld(iAnm),
    });
  }

  return { artikel };
}

/** Kleiner CSV-Leser: Trennzeichen frei waehlbar, Anfuehrungszeichen erlaubt. */
export function zerlegeCsv(inhalt: string, trenner: string): string[][] {
  const zeilen: string[][] = [];
  let felder: string[] = [];
  let feld = '';
  let inAnfuehrung = false;

  const text = inhalt.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

  for (let i = 0; i < text.length; i += 1) {
    const z = text[i];

    if (inAnfuehrung) {
      if (z === '"') {
        if (text[i + 1] === '"') {
          feld += '"';
          i += 1;
        } else {
          inAnfuehrung = false;
        }
      } else {
        feld += z;
      }
      continue;
    }

    if (z === '"') inAnfuehrung = true;
    else if (z === trenner) {
      felder.push(feld);
      feld = '';
    } else if (z === '\n') {
      felder.push(feld);
      zeilen.push(felder);
      felder = [];
      feld = '';
    } else {
      feld += z;
    }
  }

  if (feld !== '' || felder.length > 0) {
    felder.push(feld);
    zeilen.push(felder);
  }

  return zeilen;
}
