/**
 * Anreicherung eines Artikels: Cache -> OXOMI -> Cache.
 *
 * Die Kaskade folgt UEBERGABE.md Abschnitt 7, angepasst an das, was der
 * Kalibrierlauf vom 25.08.2026 gegen das echte Portal ergeben hat:
 *
 *   0. Artikel-Cache. Treffer, der nicht veraltet ist -> fertig, kein Aufruf.
 *   1. EAN aufloesen. Liefert die OXOMI-Lieferantennummer und die
 *      Artikelnummer des Lieferanten. Sicherster Weg; funktioniert auch bei
 *      Eigenmarken, wo die Werksnummer des Fertigers nicht passt.
 *   2. Werksnummer plus gelernte Lieferantennummer. Greift, sobald derselbe
 *      Hersteller einmal ueber eine EAN aufgeloest wurde.
 *   3. Kein Treffer. Nacherfassung im Review (Stufen 3 bis 5 des Fachkonzepts).
 *
 * Technische Stoerungen werden nie in den Cache geschrieben: Ein kurzzeitig
 * nicht erreichbares OXOMI darf keinen dauerhaft falschen Eintrag hinterlassen.
 */
import { Drossel } from './http.ts';
import { ladeKonfiguration, fehlendeZugangsdaten, type OxomiKonfiguration } from './config.ts';
import { werteProduktAus } from './auswertung.ts';
import { schlageKapitelVor } from './kapitel.ts';
import { holeProduktdaten, loeseGtinAuf, type ClientUmgebung } from './client.ts';
import { bildeCacheSchluessel, type ArtikelCacheSpeicher } from './cache.ts';
import { speicherLieferanten, type LieferantenSpeicher } from './lieferanten.ts';
import type {
  AnreicherungsOptionen,
  ArtikelDaten,
  ArtikelSchluessel,
  AufrufDiagnose,
  OxomiKennung,
  Trefferstatus,
} from './types.ts';

export interface AnreicherungsErgebnis {
  daten: ArtikelDaten;
  /** Nur gefuellt, wenn mitDiagnose gesetzt war. */
  diagnose: AufrufDiagnose[];
}

const STANDARD_MAX_ALTER_TAGE = 90;

export interface AnreicherungsUmgebung {
  cache?: ArtikelCacheSpeicher | null;
  lieferanten?: LieferantenSpeicher | null;
  konfiguration?: OxomiKonfiguration;
  drossel?: Drossel;
  /** Fuer Tests ueberschreibbar. */
  jetzt?: () => number;
}

export async function reichereAn(
  schluessel: ArtikelSchluessel,
  optionen: AnreicherungsOptionen = {},
  umgebung: AnreicherungsUmgebung = {},
): Promise<AnreicherungsErgebnis> {
  const jetzt = umgebung.jetzt ?? Date.now;
  const cacheSchluessel = bildeCacheSchluessel(schluessel);
  const diagnose: AufrufDiagnose[] = [];

  // ---- 0. Cache ---------------------------------------------------------
  if (!optionen.cacheUmgehen && umgebung.cache) {
    const eintrag = await umgebung.cache.lesen(schluessel).catch(() => null);
    if (eintrag && !istVeraltet(eintrag.stand, optionen.maxAlterTage, jetzt())) {
      return { daten: { ...eintrag.daten, quelle: 'cache' }, diagnose };
    }
  }

  // ---- Zugangsdaten -----------------------------------------------------
  const fehlt = fehlendeZugangsdaten();
  if (fehlt.length > 0 && !umgebung.konfiguration) {
    return {
      daten: leer(schluessel, cacheSchluessel, 'nicht_konfiguriert', jetzt(), [
        `OXOMI-Zugangsdaten unvollstaendig (${fehlt.join(', ')}). Es wurde nicht angefragt.`,
      ]),
      diagnose,
    };
  }

  const konfiguration = umgebung.konfiguration ?? ladeKonfiguration();
  const drossel =
    umgebung.drossel ?? new Drossel(konfiguration.maxParallel, konfiguration.mindestabstandMs);
  const lieferanten = umgebung.lieferanten ?? speicherLieferanten();
  const client: ClientUmgebung = { konfiguration, drossel, jetzt };

  const hinweise: string[] = [];
  let stoerung: string | undefined;

  // ---- 1. EAN aufloesen -------------------------------------------------
  let kennung: OxomiKennung | null = null;
  let suchweg: string | undefined;

  const ean = (schluessel.ean ?? '').trim();
  if (ean !== '') {
    const ergebnis = await loeseGtinAuf(ean, client);
    if (optionen.mitDiagnose) {
      diagnose.push({
        suchweg: 'ean',
        beschreibung: 'EAN/GTIN bei OXOMI aufloesen',
        treffer: Boolean(ergebnis.kennung),
        ...ergebnis.spur,
      });
    }
    if (ergebnis.stoerung) stoerung = ergebnis.stoerung;
    if (ergebnis.kennung) {
      kennung = ergebnis.kennung;
      suchweg = 'ean';
      // Dazulernen: Ab jetzt ist die Lieferantennummer dieses Herstellers bekannt.
      if (schluessel.hersteller) {
        await lieferanten
          .merke(schluessel.hersteller, ergebnis.kennung.supplierNumber)
          .catch(() => undefined);
      }
    } else if (!ergebnis.stoerung) {
      hinweise.push('OXOMI kennt diese EAN nicht.');
    }
  } else {
    hinweise.push('Keine EAN vorhanden - der sicherste Suchweg entfaellt.');
  }

  // ---- 2. Werksnummer plus gelernte Lieferantennummer -------------------
  const werksnummer = (schluessel.werksnummer ?? '').trim();
  if (!kennung && werksnummer !== '' && schluessel.hersteller) {
    const zuordnung = await lieferanten.finde(schluessel.hersteller).catch(() => null);
    if (zuordnung) {
      kennung = { supplierNumber: zuordnung.supplierNumber, supplierItemNumber: werksnummer };
      suchweg = 'werksnummer-mit-gelerntem-lieferanten';
    } else {
      hinweise.push(
        `Fuer "${schluessel.hersteller}" ist noch keine OXOMI-Lieferantennummer bekannt. Sie wird gelernt, sobald ein Artikel dieses Herstellers ueber die EAN gefunden wurde.`,
      );
    }
  }

  if (!kennung) {
    const status: Trefferstatus = stoerung ? 'fehler' : 'kein_treffer';
    const abschluss = leer(schluessel, cacheSchluessel, status, jetzt(), [
      ...hinweise,
      stoerung
        ? `Kein Ergebnis wegen einer Stoerung: ${stoerung}`
        : 'Der Artikel liess sich in OXOMI nicht auffinden. Nacherfassung im Review.',
    ]);
    if (!stoerung) await schreibeSicher(umgebung.cache, abschluss);
    return { daten: abschluss, diagnose };
  }

  // ---- Produktdaten holen ----------------------------------------------
  const produktErgebnis = await holeProduktdaten(kennung, client);
  if (optionen.mitDiagnose) {
    diagnose.push({
      suchweg: suchweg ?? 'produktdaten',
      beschreibung: `Produktdaten zu Lieferant ${kennung.supplierNumber}, Artikel ${kennung.supplierItemNumber}`,
      treffer: produktErgebnis.produkt?.resolved === true,
      ...produktErgebnis.spur,
    });
  }

  if (produktErgebnis.stoerung || !produktErgebnis.produkt) {
    const abschluss = leer(schluessel, cacheSchluessel, 'fehler', jetzt(), [
      ...hinweise,
      `Die Produktdaten konnten nicht geladen werden: ${
        produktErgebnis.stoerung ?? 'keine Antwort'
      }`,
    ]);
    abschluss.oxomiKennung = kennung;
    return { daten: abschluss, diagnose };
  }

  const produkt = produktErgebnis.produkt;
  if (produkt.resolved !== true) {
    const abschluss = leer(schluessel, cacheSchluessel, 'kein_treffer', jetzt(), [
      ...hinweise,
      'OXOMI kennt diese Kombination aus Lieferant und Artikelnummer nicht.',
    ]);
    abschluss.oxomiKennung = kennung;
    abschluss.suchweg = suchweg;
    await schreibeSicher(umgebung.cache, abschluss);
    return { daten: abschluss, diagnose };
  }

  const aus = werteProduktAus(produkt);

  const produktbilder = aus.bilder.filter((b) => !b.istMasszeichnung);
  if (produktbilder.length === 0) hinweise.push('OXOMI liefert kein Produktbild zu diesem Artikel.');
  if (aus.fakten.length === 0) hinweise.push('OXOMI liefert keine Merkmale zu diesem Artikel.');
  if (!aus.klassifikation) {
    hinweise.push(
      'Keine Klassifikation zu diesem Artikel. Das Kapitel wird aus der Bezeichnung vorgeschlagen.',
    );
  }
  if (aus.fakten.some((f) => f.herkunft === 'beschreibungstext')) {
    hinweise.push(
      'Die Merkmale stammen aus dem Beschreibungstext, nicht aus der Klassifikation - vor dem Druck pruefen.',
    );
  }

  const status: Trefferstatus =
    produktbilder.length > 0 && aus.fakten.length > 0 ? 'treffer' : 'teiltreffer';

  const daten: ArtikelDaten = {
    cacheSchluessel,
    schluessel,
    status,
    bezeichnung: aus.bezeichnung,
    langtext: aus.langtext,
    hersteller: aus.hersteller ?? schluessel.hersteller ?? undefined,
    bilder: aus.bilder,
    fakten: aus.fakten,
    eigenschaften: aus.eigenschaften,
    klassifikation: aus.klassifikation,
    dokumente: aus.dokumente,
    kapitelvorschlag: schlageKapitelVor({
      klassifikationCode: aus.klassifikation?.code,
      klassifikationBezeichnung: aus.klassifikation?.bezeichnung,
      bezeichnung: aus.bezeichnung ?? schluessel.bezeichnungHinweis ?? null,
    }),
    quelle: 'oxomi',
    stand: new Date(jetzt()).toISOString(),
    suchweg,
    oxomiKennung: { ...kennung, productId: produkt.productId },
    hinweise,
  };

  await schreibeSicher(umgebung.cache, daten);
  return { daten, diagnose };
}

/** Mehrere Artikel anreichern. Die Drossel begrenzt die Last auf OXOMI. */
export async function reichereMehrereAn(
  schluessel: ReadonlyArray<ArtikelSchluessel>,
  optionen: AnreicherungsOptionen = {},
  umgebung: AnreicherungsUmgebung = {},
): Promise<AnreicherungsErgebnis[]> {
  const konfiguration = umgebung.konfiguration;
  const drossel =
    umgebung.drossel ??
    new Drossel(konfiguration?.maxParallel ?? 3, konfiguration?.mindestabstandMs ?? 120);
  const lieferanten = umgebung.lieferanten ?? speicherLieferanten();

  // Bewusst nacheinander: Jede EAN-Aufloesung lernt eine Lieferantennummer
  // dazu, von der die folgenden Artikel schon profitieren koennen.
  const ergebnisse: AnreicherungsErgebnis[] = [];
  for (const einzeln of schluessel) {
    ergebnisse.push(await reichereAn(einzeln, optionen, { ...umgebung, drossel, lieferanten }));
  }
  return ergebnisse;
}

// ---------------------------------------------------------------------------

function leer(
  schluessel: ArtikelSchluessel,
  cacheSchluessel: string,
  status: Trefferstatus,
  jetztMs: number,
  hinweise: string[],
): ArtikelDaten {
  return {
    cacheSchluessel,
    schluessel,
    status,
    hersteller: schluessel.hersteller ?? undefined,
    bilder: [],
    fakten: [],
    eigenschaften: [],
    klassifikation: null,
    dokumente: [],
    kapitelvorschlag: schlageKapitelVor({ bezeichnung: schluessel.bezeichnungHinweis ?? null }),
    quelle: 'oxomi',
    stand: new Date(jetztMs).toISOString(),
    hinweise,
  };
}

async function schreibeSicher(cache: ArtikelCacheSpeicher | null | undefined, daten: ArtikelDaten) {
  if (!cache) return;
  try {
    await cache.schreiben(daten);
  } catch {
    // Ein nicht schreibbarer Cache darf die Anreicherung nicht zerstoeren.
    daten.hinweise.push('Ergebnis konnte nicht in den Artikel-Cache geschrieben werden.');
  }
}

function istVeraltet(stand: Date, maxAlterTage: number | undefined, jetztMs: number): boolean {
  const grenze = (maxAlterTage ?? STANDARD_MAX_ALTER_TAGE) * 86_400_000;
  return jetztMs - stand.getTime() > grenze;
}
