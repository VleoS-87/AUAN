/**
 * Postgres-Umsetzung des Artikel-Caches.
 *
 * Nur diese Datei kennt die Tabelle artikel_cache. Der Rest des OXOMI-Moduls
 * spricht ausschliesslich gegen das Interface aus cache.ts.
 */
import { sql } from '@/lib/db/client';
import { entfernePreisfelder } from './preissperre';
import {
  bildeCacheSchluessel,
  normalisiereHersteller,
  normalisiereNummer,
  type ArtikelCacheSpeicher,
  type CacheEintrag,
} from './cache';
import type { ArtikelDaten, ArtikelSchluessel } from './types';

interface Zeile {
  daten: ArtikelDaten;
  stand: string | Date;
}

export function postgresCache(): ArtikelCacheSpeicher {
  const db = sql();

  return {
    async lesen(schluessel: ArtikelSchluessel): Promise<CacheEintrag | null> {
      const primaer = bildeCacheSchluessel(schluessel);
      const her = normalisiereHersteller(schluessel.hersteller);
      const werk = normalisiereNummer(schluessel.werksnummer);
      const nr = normalisiereNummer(schluessel.pietschNr);
      const ean = normalisiereNummer(schluessel.ean);

      // Reihenfolge = Matching-Kaskade. Der sicherste Schluessel zuerst.
      const versuche: Array<{ text: string; werte: unknown[] }> = [
        { text: 'SELECT daten, stand FROM artikel_cache WHERE cache_schluessel = $1', werte: [primaer] },
      ];
      if (her && werk) {
        versuche.push({
          text: 'SELECT daten, stand FROM artikel_cache WHERE hersteller = $1 AND werksnummer = $2 LIMIT 1',
          werte: [her, werk],
        });
      }
      if (werk) {
        versuche.push({
          text: 'SELECT daten, stand FROM artikel_cache WHERE werksnummer = $1 LIMIT 1',
          werte: [werk],
        });
      }
      if (nr) {
        versuche.push({
          text: 'SELECT daten, stand FROM artikel_cache WHERE pietsch_nr = $1 LIMIT 1',
          werte: [nr],
        });
      }
      if (ean) {
        versuche.push({
          text: 'SELECT daten, stand FROM artikel_cache WHERE ean = $1 LIMIT 1',
          werte: [ean],
        });
      }

      for (const versuch of versuche) {
        const zeilen = (await db.query(versuch.text, versuch.werte)) as Zeile[];
        if (zeilen.length > 0) {
          return { daten: zeilen[0].daten, stand: new Date(zeilen[0].stand) };
        }
      }
      return null;
    },

    async schreiben(daten: ArtikelDaten): Promise<void> {
      // Doppelte Sicherung: Auch hier laeuft nichts ohne Preissperre in die Datenbank.
      const sicher = entfernePreisfelder(daten);

      await db.query(
        `INSERT INTO artikel_cache (
           cache_schluessel, pietsch_nr, hersteller, werksnummer, ean, status,
           bezeichnung, serie, eclass_code, kapitel_vorschlag, quelle, suchweg,
           anzahl_bilder, anzahl_fakten, daten, stand, aktualisiert_am
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
         ON CONFLICT (cache_schluessel) DO UPDATE SET
           pietsch_nr = EXCLUDED.pietsch_nr,
           hersteller = EXCLUDED.hersteller,
           werksnummer = EXCLUDED.werksnummer,
           ean = EXCLUDED.ean,
           status = EXCLUDED.status,
           bezeichnung = EXCLUDED.bezeichnung,
           serie = EXCLUDED.serie,
           eclass_code = EXCLUDED.eclass_code,
           kapitel_vorschlag = EXCLUDED.kapitel_vorschlag,
           quelle = EXCLUDED.quelle,
           suchweg = EXCLUDED.suchweg,
           anzahl_bilder = EXCLUDED.anzahl_bilder,
           anzahl_fakten = EXCLUDED.anzahl_fakten,
           daten = EXCLUDED.daten,
           stand = EXCLUDED.stand,
           aktualisiert_am = now()`,
        [
          sicher.cacheSchluessel,
          normalisiereNummer(sicher.schluessel.pietschNr),
          normalisiereHersteller(sicher.schluessel.hersteller),
          normalisiereNummer(sicher.schluessel.werksnummer),
          normalisiereNummer(sicher.schluessel.ean),
          sicher.status,
          sicher.bezeichnung ?? null,
          sicher.serie ?? null,
          sicher.eclass?.code ?? null,
          sicher.kapitelvorschlag.kapitel ?? null,
          sicher.quelle,
          sicher.suchweg ?? null,
          sicher.bilder.length,
          sicher.fakten.length,
          JSON.stringify(sicher),
          sicher.stand,
        ],
      );
    },

    async anzahl(): Promise<number> {
      const zeilen = (await db.query('SELECT count(*)::int AS n FROM artikel_cache')) as Array<{ n: number }>;
      return zeilen[0]?.n ?? 0;
    },
  };
}
