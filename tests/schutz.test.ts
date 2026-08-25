import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pruefeSchluessel } from '../lib/dev/schutz.ts';

test('ohne APP_SECRET bleibt die Testroute zu', () => {
  const vorher = process.env.APP_SECRET;
  delete process.env.APP_SECRET;
  const e = pruefeSchluessel('egal');
  assert.equal(e.erlaubt, false);
  if (!e.erlaubt) assert.equal(e.httpStatus, 503);
  if (vorher !== undefined) process.env.APP_SECRET = vorher;
});

test('falscher und fehlender Schluessel werden abgewiesen', () => {
  process.env.APP_SECRET = 'richtiger-schluessel';
  assert.equal(pruefeSchluessel(undefined).erlaubt, false);
  assert.equal(pruefeSchluessel('').erlaubt, false);
  assert.equal(pruefeSchluessel('falsch').erlaubt, false);
  assert.equal(pruefeSchluessel('richtiger-schluessel!').erlaubt, false);
  delete process.env.APP_SECRET;
});

test('der richtige Schluessel wird durchgelassen', () => {
  process.env.APP_SECRET = 'richtiger-schluessel';
  assert.equal(pruefeSchluessel('richtiger-schluessel').erlaubt, true);
  delete process.env.APP_SECRET;
});
