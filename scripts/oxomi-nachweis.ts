/**
 * Nachweislauf fuer Stufe T-A.
 *
 * Laesst die vollstaendige Artikel-Testliste durch den fertigen
 * OXOMI-Baustein laufen - mit echter Datenbank, echtem Artikel-Cache und
 * echten OXOMI-Aufrufen - und schreibt das Ergebnis ins Build-Protokoll.
 *
 * Warum im Build: Die Testroute /dev/oxomi-test zeigt dasselbe Ergebnis, ist
 * aber mit APP_SECRET geschuetzt; der Schluessel liegt beim Auftraggeber. Der
 * Build ist der Ort, an dem sich der Nachweis ohne Schluessel fuehren laesst.
 *
 * Laeuft NUR, solange die Marker-Datei scripts/NACHWEIS_ANFORDERN im Repo
 * liegt. Ohne Marker keine einzige Anfrage nach aussen.
 *
 * Gibt niemals Zugangsdaten aus und bricht den Build nie ab.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fehlendeZugangsdaten } from '../lib/oxomi/config.ts';
import { reichereMehrereAn } from '../lib/oxomi/anreicherung.ts';
import { speicherCache } from '../lib/oxomi/cache.ts';
import { speicherLieferanten } from '../lib/oxomi/lieferanten.ts';
import { postgresCache } from '../lib/oxomi/cache-postgres.ts';
import { postgresLieferanten } from '../lib/oxomi/lieferanten-postgres.ts';
import { datenbankVerfuegbar } from '../lib/db/client.ts';
import { fuehreMigrationenAus } from '../lib/db/migrate.ts';
import type { ArtikelCacheSpeicher } from '../lib/oxomi/cache.ts';
import type { LieferantenSpeicher } from '../lib/oxomi/lieferanten.ts';

const MARKER = join(process.cwd(), 'scripts', 'NACHWEIS_ANFORDERN');
const RAHMEN = '='.repeat(72);

function zeile(text = ''): void {
  process.stdout.write(`[T-A NACHWEIS] ${text}\n`);
}

interface TestArtikel {
  pietschNr: string;
  bezeichnung: string;
  werksnummer: string;
  ean: string;
  hersteller: string;
  typ: string;
  bezeichnungHinweis: string;
}

function ladeTestartikel(): TestArtikel[] {
  const inhalt = readFileSync(join(process.cwd(), 'testdaten/artikel/artikel_testliste.csv'), 'utf8');
  const zeilen = inhalt.replace(/\r/g, '').split('\n').filter((z) => z.trim() !== '');
  const kopf = zeilen[0].split(';').map((k) => k.trim().toLowerCase());
  const i = (name: string) => kopf.indexOf(name);
  return zeilen.slice(1).map((z) => {
    const f = z.split(';');
    const feld = (name: string) => (f[i(name)] ?? '').trim();
    return {
      pietschNr: feld('pietsch_artikelnummer'),
      bezeichnung: feld('bezeichnung'),
      werksnummer: feld('werksnummer'),
      ean: feld('ean'),
      hersteller: feld('hersteller'),
      typ: feld('typ'),
      bezeichnungHinweis: feld('bezeichnung'),
    };
  });
}

async function hauptlauf(): Promise<void> {
  if (!existsSync(MARKER)) return;

  zeile(RAHMEN);
  zeile('Nachweislauf T-A: die Testliste durch den fertigen Baustein');

  const fehlt = fehlendeZugangsdaten();
  if (fehlt.length > 0) {
    zeile(`ABBRUCH: Zugangsdaten unvollstaendig (${fehlt.join(', ')}).`);
    zeile(RAHMEN);
    return;
  }

  // --- Datenbank vorbereiten -------------------------------------------
  let cache: ArtikelCacheSpeicher = speicherCache();
  let lieferanten: LieferantenSpeicher = speicherLieferanten();
  let mitDatenbank = false;

  if (datenbankVerfuegbar()) {
    const migration = await fuehreMigrationenAus();
    if (migration.fehler) {
      zeile(`Datenbank nicht nutzbar: ${migration.fehler}`);
    } else {
      zeile(
        `Datenbank bereit. Migrationen angewendet: ${
          migration.angewendet.join(', ') || 'keine neuen'
        }; bereits vorhanden: ${migration.uebersprungen.join(', ') || 'keine'}`,
      );
      cache = postgresCache();
      lieferanten = postgresLieferanten();
      mitDatenbank = true;
    }
  } else {
    zeile('DATABASE_URL ist nicht gesetzt - der Lauf nutzt nur den Arbeitsspeicher.');
  }

  const artikel = ladeTestartikel();
  zeile(`${artikel.length} Testartikel geladen.`);
  zeile();

  // --- Erster Durchgang: frisch von OXOMI ------------------------------
  zeile('DURCHGANG 1 - frisch von OXOMI (Cache wird umgangen)');
  const start1 = Date.now();
  const ergebnisse = await reichereMehrereAn(artikel, { cacheUmgehen: true }, { cache, lieferanten });
  const dauer1 = Date.now() - start1;

  let treffer = 0;
  let mitBild = 0;
  let mitFakten = 0;
  let mitMasszeichnung = 0;
  let mitKapitel = 0;
  let mitEclass = 0;

  for (let n = 0; n < artikel.length; n += 1) {
    const a = artikel[n];
    const d = ergebnisse[n].daten;
    const produktbilder = d.bilder.filter((b) => !b.istMasszeichnung);
    const zeichnungen = d.bilder.filter((b) => b.istMasszeichnung);

    if (d.status === 'treffer' || d.status === 'teiltreffer') treffer += 1;
    if (produktbilder.length > 0) mitBild += 1;
    if (d.fakten.length > 0) mitFakten += 1;
    if (zeichnungen.length > 0) mitMasszeichnung += 1;
    if (d.kapitelvorschlag.kapitel) mitKapitel += 1;
    if (d.eclass) mitEclass += 1;

    zeile(`  ${a.pietschNr} (${a.typ}) ${a.bezeichnung.slice(0, 46)}`);
    zeile(
      `     Status ${d.status} | Suchweg ${d.suchweg ?? '-'} | OXOMI ${
        d.oxomiKennung ? `${d.oxomiKennung.supplierNumber}/${d.oxomiKennung.supplierItemNumber}` : '-'
      }`,
    );
    zeile(
      `     ${produktbilder.length} Produktbilder, ${zeichnungen.length} Maßzeichnungen, ${d.fakten.length} Merkmale, ${d.dokumente.length} Dokumente`,
    );
    zeile(`     Kapitelvorschlag: ${d.kapitelvorschlag.kapitel ?? '-'} (${d.kapitelvorschlag.grundlage})`);
    if (d.fakten.length > 0) {
      const probe = d.fakten.slice(0, 6).map((f) => `${f.name}=${f.wert}`).join(' | ');
      zeile(`     Fakten (Auszug): ${probe}`);
    }
    if (produktbilder[0]) zeile(`     Erstes Bild: ${produktbilder[0].url.slice(0, 110)}`);

    // Wo keine Merkmale herauskommen, zeigen, was OXOMI stattdessen liefert.
    if (d.fakten.length === 0 && d.oxomiKennung) {
      zeile('     KEINE MERKMALE - vorhandene Texte:');
      if (!d.langtext) zeile('       (auch kein Langtext)');
      else zeile(`       Langtext (Anfang): ${d.langtext.replace(/\s+/g, ' ').slice(0, 400)}`);
    }
  }

  zeile();
  zeile(
    `AUSWERTUNG: Trefferquote ${Math.round((treffer / artikel.length) * 100)} % (${treffer}/${
      artikel.length
    }), mit Bild ${mitBild}/${artikel.length}, mit Maßzeichnung ${mitMasszeichnung}/${
      artikel.length
    }, mit Merkmalen ${mitFakten}/${artikel.length}, mit eCl@ss ${mitEclass}/${
      artikel.length
    }, mit Kapitelvorschlag ${mitKapitel}/${artikel.length}`,
  );
  zeile(`Dauer Durchgang 1: ${(dauer1 / 1000).toFixed(1)} s`);
  zeile();

  // --- Zweiter Durchgang: aus dem Cache --------------------------------
  zeile('DURCHGANG 2 - derselbe Lauf, jetzt aus dem Artikel-Cache');
  const start2 = Date.now();
  const ausCache = await reichereMehrereAn(artikel, {}, { cache, lieferanten });
  const dauer2 = Date.now() - start2;
  const cacheTreffer = ausCache.filter((e) => e.daten.quelle === 'cache').length;

  zeile(
    `  ${cacheTreffer}/${artikel.length} Artikel kamen aus dem Cache. Dauer: ${(dauer2 / 1000).toFixed(
      1,
    )} s statt ${(dauer1 / 1000).toFixed(1)} s.`,
  );

  if (mitDatenbank && cache.anzahl) {
    zeile(`  Eintraege in artikel_cache: ${await cache.anzahl()}`);
  }
  if (lieferanten.alle) {
    const gelernt = await lieferanten.alle();
    zeile(
      `  Gelernte Lieferantennummern: ${
        gelernt.map((l) => `${l.hersteller}=${l.supplierNumber}`).join(', ') || 'keine'
      }`,
    );
  }

  zeile(RAHMEN);
}

hauptlauf()
  .catch((fehler) => {
    zeile(
      `Unerwarteter Fehler, Build laeuft trotzdem weiter: ${
        fehler instanceof Error ? fehler.message : String(fehler)
      }`,
    );
  })
  .finally(() => {
    process.exit(0);
  });
