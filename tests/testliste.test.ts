import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ladeTestliste, zerlegeCsv } from '../lib/dev/testliste.ts';

test('liest die 5 Testartikel aus der CSV', () => {
  const { artikel, fehler } = ladeTestliste();
  assert.equal(fehler, undefined);
  assert.equal(artikel.length, 5);

  const ersterArtikel = artikel[0];
  assert.equal(ersterArtikel.pietschNr, '083054001');
  assert.equal(ersterArtikel.werksnummer, '501632001');
  assert.equal(ersterArtikel.hersteller, 'Geberit/Keramag');
  assert.equal(ersterArtikel.typ, 'marke');

  assert.equal(artikel.filter((a) => a.typ === 'eigenmarke').length, 3);
});

test('der CSV-Leser kommt mit Anfuehrungszeichen zurecht', () => {
  const zeilen = zerlegeCsv('a;b\n"eins;zwei";drei\n', ';');
  assert.deepEqual(zeilen, [
    ['a', 'b'],
    ['eins;zwei', 'drei'],
  ]);
});
