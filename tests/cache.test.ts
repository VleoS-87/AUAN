import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bildeCacheSchluessel, speicherCache } from '../lib/oxomi/cache.ts';
import type { ArtikelDaten } from '../lib/oxomi/types.ts';

test('Hersteller und Werksnummer bilden den sichersten Schluessel', () => {
  assert.equal(
    bildeCacheSchluessel({ hersteller: 'hansgrohe', werksnummer: '60133450', pietschNr: '054107001' }),
    'hw:hansgrohe|60133450',
  );
});

test('Schreibweisen fuehren auf denselben Schluessel', () => {
  const a = bildeCacheSchluessel({ hersteller: 'Villeroy & Boch', werksnummer: '5660R001' });
  const b = bildeCacheSchluessel({ hersteller: 'villeroy&boch', werksnummer: ' 5660r001 ' });
  assert.equal(a, b);
});

test('faellt auf Werksnummer, Pietsch-Nummer und EAN zurueck', () => {
  assert.equal(bildeCacheSchluessel({ werksnummer: '5660R001' }), 'w:5660R001');
  assert.equal(bildeCacheSchluessel({ pietschNr: '015250001' }), 'p:015250001');
  assert.equal(bildeCacheSchluessel({ ean: '4051202285432' }), 'e:4051202285432');
  assert.equal(bildeCacheSchluessel({}), 'unbestimmt');
});

test('geschriebene Eintraege werden wiedergefunden', async () => {
  const cache = speicherCache();
  const daten: ArtikelDaten = {
    cacheSchluessel: 'hw:hansgrohe|60133450',
    schluessel: { hersteller: 'hansgrohe', werksnummer: '60133450' },
    status: 'treffer',
    bilder: [],
    fakten: [],
    eclass: null,
    dokumente: [],
    kapitelvorschlag: { kapitel: 'Waschtischanlage', grundlage: 'bezeichnung' },
    quelle: 'oxomi',
    stand: new Date().toISOString(),
    hinweise: [],
  };

  await cache.schreiben(daten);
  const gelesen = await cache.lesen({ hersteller: 'hansgrohe', werksnummer: '60133450' });
  assert.equal(gelesen?.daten.status, 'treffer');
  assert.equal(await cache.anzahl!(), 1);
});
