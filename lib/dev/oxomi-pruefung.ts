/**
 * Der Pruefstand fuer Stufe T-A: laesst die Artikel-Testliste durch den
 * OXOMI-Baustein laufen und wertet aus, wie gut die Abdeckung ist.
 *
 * Wird von der Testseite und von der JSON-Route gemeinsam benutzt, damit
 * beide dasselbe Ergebnis zeigen.
 */
import { datenbankVerfuegbar } from '@/lib/db/client';
import {
  fehlendeZugangsdaten,
  postgresCache,
  reichereMehrereAn,
  speicherCache,
  type AnreicherungsErgebnis,
  type ArtikelCacheSpeicher,
} from '@/lib/oxomi';
import { ladeTestliste, type TestArtikel } from './testliste';

export interface PruefErgebnisZeile {
  artikel: TestArtikel;
  ergebnis: AnreicherungsErgebnis;
}

export interface Auswertung {
  gesamt: number;
  treffer: number;
  vollstaendig: number;
  teilweise: number;
  ohneTreffer: number;
  stoerungen: number;
  nichtKonfiguriert: number;
  mitBild: number;
  mitFakten: number;
  mitEclass: number;
  mitKapitel: number;
  trefferquoteProzent: number;
  bildquoteProzent: number;
  eclassquoteProzent: number;
  nachTyp: Array<{ typ: string; gesamt: number; treffer: number }>;
  luecken: string[];
}

export interface Pruefstand {
  zeilen: PruefErgebnisZeile[];
  auswertung: Auswertung;
  umgebung: {
    oxomiKonfiguriert: boolean;
    fehlendeVariablen: string[];
    datenbank: boolean;
    cacheEintraege: number | null;
    cacheAktiv: boolean;
  };
  dauerMs: number;
  testlisteFehler?: string;
}

export interface PruefOptionen {
  cacheUmgehen?: boolean;
  mitDiagnose?: boolean;
}

export async function fuehrePruefungAus(optionen: PruefOptionen = {}): Promise<Pruefstand> {
  const start = Date.now();
  const { artikel, fehler } = ladeTestliste();

  const fehlt = fehlendeZugangsdaten();
  const dbDa = datenbankVerfuegbar();

  let cache: ArtikelCacheSpeicher | null = null;
  let cacheAktiv = false;
  if (dbDa) {
    try {
      cache = postgresCache();
      cacheAktiv = true;
    } catch {
      cache = speicherCache();
    }
  } else {
    cache = speicherCache();
  }

  const ergebnisse = await reichereMehrereAn(
    artikel,
    { cacheUmgehen: optionen.cacheUmgehen, mitDiagnose: optionen.mitDiagnose },
    { cache },
  );

  const zeilen: PruefErgebnisZeile[] = artikel.map((a, i) => ({ artikel: a, ergebnis: ergebnisse[i] }));

  let cacheEintraege: number | null = null;
  if (cacheAktiv && cache?.anzahl) {
    cacheEintraege = await cache.anzahl().catch(() => null);
  }

  return {
    zeilen,
    auswertung: werteAus(zeilen),
    umgebung: {
      oxomiKonfiguriert: fehlt.length === 0,
      fehlendeVariablen: fehlt,
      datenbank: dbDa,
      cacheEintraege,
      cacheAktiv,
    },
    dauerMs: Date.now() - start,
    testlisteFehler: fehler,
  };
}

function werteAus(zeilen: PruefErgebnisZeile[]): Auswertung {
  const gesamt = zeilen.length;
  const daten = zeilen.map((z) => z.ergebnis.daten);

  const vollstaendig = daten.filter((d) => d.status === 'treffer').length;
  const teilweise = daten.filter((d) => d.status === 'teiltreffer').length;
  const ohneTreffer = daten.filter((d) => d.status === 'kein_treffer').length;
  const stoerungen = daten.filter((d) => d.status === 'fehler').length;
  const nichtKonfiguriert = daten.filter((d) => d.status === 'nicht_konfiguriert').length;
  const treffer = vollstaendig + teilweise;

  const mitBild = daten.filter((d) => d.bilder.length > 0).length;
  const mitFakten = daten.filter((d) => d.fakten.length > 0).length;
  const mitEclass = daten.filter((d) => Boolean(d.eclass)).length;
  const mitKapitel = daten.filter((d) => d.kapitelvorschlag.kapitel !== null).length;

  const typen = new Map<string, { gesamt: number; treffer: number }>();
  for (const zeile of zeilen) {
    const typ = zeile.artikel.typ || 'unbekannt';
    const eintrag = typen.get(typ) ?? { gesamt: 0, treffer: 0 };
    eintrag.gesamt += 1;
    if (zeile.ergebnis.daten.status === 'treffer' || zeile.ergebnis.daten.status === 'teiltreffer') {
      eintrag.treffer += 1;
    }
    typen.set(typ, eintrag);
  }

  const luecken: string[] = [];
  for (const zeile of zeilen) {
    const d = zeile.ergebnis.daten;
    const name = `${zeile.artikel.pietschNr ?? '-'} ${zeile.artikel.bezeichnung}`.slice(0, 70);
    if (d.status === 'kein_treffer') luecken.push(`${name}: kein Treffer in OXOMI`);
    else if (d.status === 'fehler') luecken.push(`${name}: Stoerung beim Abruf`);
    else if (d.status === 'nicht_konfiguriert') luecken.push(`${name}: nicht abgefragt (Zugangsdaten fehlen)`);
    else {
      if (d.bilder.length === 0) luecken.push(`${name}: Treffer, aber ohne Bild`);
      if (d.fakten.length === 0) luecken.push(`${name}: Treffer, aber ohne Merkmale`);
      if (!d.eclass) luecken.push(`${name}: Treffer, aber ohne eCl@ss`);
    }
  }

  const quote = (n: number) => (gesamt === 0 ? 0 : Math.round((n / gesamt) * 1000) / 10);

  return {
    gesamt,
    treffer,
    vollstaendig,
    teilweise,
    ohneTreffer,
    stoerungen,
    nichtKonfiguriert,
    mitBild,
    mitFakten,
    mitEclass,
    mitKapitel,
    trefferquoteProzent: quote(treffer),
    bildquoteProzent: quote(mitBild),
    eclassquoteProzent: quote(mitEclass),
    nachTyp: [...typen.entries()].map(([typ, w]) => ({ typ, ...w })),
    luecken,
  };
}
