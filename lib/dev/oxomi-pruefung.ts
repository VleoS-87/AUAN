/**
 * Der Pruefstand fuer Stufe T-A: laesst die Artikel-Testliste durch den
 * OXOMI-Baustein laufen und wertet aus, wie gut die Abdeckung ist.
 *
 * Wird von der Testseite und von der JSON-Route gemeinsam benutzt, damit
 * beide dasselbe Ergebnis zeigen.
 */
import { datenbankVerfuegbar } from '@/lib/db/client';
import {
  postgresCache,
  postgresLieferanten,
  pruefeVerbindung,
  reichereMehrereAn,
  speicherCache,
  speicherLieferanten,
  type AnreicherungsErgebnis,
  type ArtikelCacheSpeicher,
  type LieferantZuordnung,
  type LieferantenSpeicher,
  type Verbindungsbericht,
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
  mitMasszeichnung: number;
  mitFakten: number;
  mitKlassifikation: number;
  mitKapitel: number;
  trefferquoteProzent: number;
  bildquoteProzent: number;
  klassifikationsquoteProzent: number;
  nachTyp: Array<{ typ: string; gesamt: number; treffer: number; bilder: number; fakten: number }>;
  luecken: string[];
}

export interface Pruefstand {
  zeilen: PruefErgebnisZeile[];
  auswertung: Auswertung;
  verbindung: Verbindungsbericht;
  lieferanten: LieferantZuordnung[];
  umgebung: {
    oxomiKonfiguriert: boolean;
    datenbank: boolean;
    cacheEintraege: number | null;
    cacheAktiv: boolean;
    cacheFehler?: string;
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

  const dbDa = datenbankVerfuegbar();
  let cache: ArtikelCacheSpeicher;
  let lieferanten: LieferantenSpeicher;
  let cacheAktiv = false;
  let cacheFehler: string | undefined;

  if (dbDa) {
    try {
      cache = postgresCache();
      lieferanten = postgresLieferanten();
      cacheAktiv = true;
    } catch (f) {
      cache = speicherCache();
      lieferanten = speicherLieferanten();
      cacheFehler = f instanceof Error ? f.message : String(f);
    }
  } else {
    cache = speicherCache();
    lieferanten = speicherLieferanten();
    cacheFehler = 'DATABASE_URL ist nicht gesetzt - der Cache haelt nur fuer diesen Aufruf.';
  }

  const verbindung = await pruefeVerbindung().catch((f) => ({
    erreichbar: false,
    angemeldet: false,
    befund: f instanceof Error ? f.message : String(f),
  }));

  const ergebnisse = await reichereMehrereAn(
    artikel,
    { cacheUmgehen: optionen.cacheUmgehen, mitDiagnose: optionen.mitDiagnose },
    { cache, lieferanten },
  );

  const zeilen: PruefErgebnisZeile[] = artikel.map((a, i) => ({
    artikel: a,
    ergebnis: ergebnisse[i],
  }));

  let cacheEintraege: number | null = null;
  if (cacheAktiv && cache.anzahl) {
    cacheEintraege = await cache.anzahl().catch(() => null);
  }
  const gelernt = lieferanten.alle ? await lieferanten.alle().catch(() => []) : [];

  return {
    zeilen,
    auswertung: werteAus(zeilen),
    verbindung,
    lieferanten: gelernt,
    umgebung: {
      oxomiKonfiguriert: verbindung.angemeldet,
      datenbank: dbDa,
      cacheEintraege,
      cacheAktiv,
      cacheFehler,
    },
    dauerMs: Date.now() - start,
    testlisteFehler: fehler,
  };
}

function werteAus(zeilen: PruefErgebnisZeile[]): Auswertung {
  const gesamt = zeilen.length;
  const daten = zeilen.map((z) => z.ergebnis.daten);

  const produktbilder = (d: (typeof daten)[number]) => d.bilder.filter((b) => !b.istMasszeichnung);
  const masszeichnungen = (d: (typeof daten)[number]) => d.bilder.filter((b) => b.istMasszeichnung);

  const vollstaendig = daten.filter((d) => d.status === 'treffer').length;
  const teilweise = daten.filter((d) => d.status === 'teiltreffer').length;
  const ohneTreffer = daten.filter((d) => d.status === 'kein_treffer').length;
  const stoerungen = daten.filter((d) => d.status === 'fehler').length;
  const nichtKonfiguriert = daten.filter((d) => d.status === 'nicht_konfiguriert').length;
  const treffer = vollstaendig + teilweise;

  const mitBild = daten.filter((d) => produktbilder(d).length > 0).length;
  const mitMasszeichnung = daten.filter((d) => masszeichnungen(d).length > 0).length;
  const mitFakten = daten.filter((d) => d.fakten.length > 0).length;
  const mitKlassifikation = daten.filter((d) => Boolean(d.klassifikation)).length;
  const mitKapitel = daten.filter((d) => d.kapitelvorschlag.kapitel !== null).length;

  const typen = new Map<string, { gesamt: number; treffer: number; bilder: number; fakten: number }>();
  for (const zeile of zeilen) {
    const typ = zeile.artikel.typ || 'unbekannt';
    const eintrag = typen.get(typ) ?? { gesamt: 0, treffer: 0, bilder: 0, fakten: 0 };
    const d = zeile.ergebnis.daten;
    eintrag.gesamt += 1;
    if (d.status === 'treffer' || d.status === 'teiltreffer') eintrag.treffer += 1;
    eintrag.bilder += d.bilder.length;
    eintrag.fakten += d.fakten.length;
    typen.set(typ, eintrag);
  }

  const luecken: string[] = [];
  for (const zeile of zeilen) {
    const d = zeile.ergebnis.daten;
    const name = `${zeile.artikel.pietschNr ?? '-'} ${zeile.artikel.bezeichnung}`.slice(0, 70);
    if (d.status === 'kein_treffer') luecken.push(`${name}: kein Treffer in OXOMI`);
    else if (d.status === 'fehler') luecken.push(`${name}: Stoerung beim Abruf`);
    else if (d.status === 'nicht_konfiguriert')
      luecken.push(`${name}: nicht abgefragt (Zugangsdaten fehlen)`);
    else {
      if (produktbilder(d).length === 0) luecken.push(`${name}: Treffer, aber ohne Produktbild`);
      if (d.fakten.length === 0) luecken.push(`${name}: Treffer, aber ohne Merkmale`);
      if (masszeichnungen(d).length === 0) luecken.push(`${name}: Treffer, aber ohne Maßzeichnung`);
      if (d.kapitelvorschlag.kapitel === null)
        luecken.push(`${name}: Treffer, aber ohne Kapitelvorschlag`);
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
    mitMasszeichnung,
    mitFakten,
    mitKlassifikation,
    mitKapitel,
    trefferquoteProzent: quote(treffer),
    bildquoteProzent: quote(mitBild),
    klassifikationsquoteProzent: quote(mitKlassifikation),
    nachTyp: [...typen.entries()].map(([typ, w]) => ({ typ, ...w })),
    luecken,
  };
}
