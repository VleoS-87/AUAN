/**
 * Token-Verfahren INT63:
 *   accessToken = md5(secret + md5(secret + portal + user + expires + roles))
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { baueZugangsparameter, berechneAccessToken, berechneExpires } from '../lib/oxomi/token.ts';

const md5 = (t: string) => createHash('md5').update(t, 'utf8').digest('hex');

test('bildet den Token genau nach der Formel', () => {
  const e = { secret: 'geheim', portal: 'portal1', user: 'nutzer', expires: 1700000000, rollen: 'shop' };
  const erwartet = md5('geheim' + md5('geheimportal1nutzer1700000000shop'));
  assert.equal(berechneAccessToken(e), erwartet);
});

test('rundet den Ablaufzeitpunkt auf ganze Tage', () => {
  const mittags = Date.UTC(2026, 7, 25, 12, 34, 56);
  assert.equal(berechneExpires(mittags, 0) % 86400, 0);
  assert.equal(berechneExpires(mittags, 1), berechneExpires(mittags, 0) + 86400);
});

test('der Ablaufzeitpunkt bleibt einen ganzen Tag stabil', () => {
  const frueh = Date.UTC(2026, 7, 25, 0, 0, 1);
  const spaet = Date.UTC(2026, 7, 25, 23, 59, 59);
  assert.equal(berechneExpires(frueh), berechneExpires(spaet));
});

test('die Zugangsparameter enthalten nie das Shared Secret', () => {
  const p = baueZugangsparameter(
    { portal: 'portal1', user: 'nutzer', secret: 'streng-geheim', rollen: 'shop' },
    Date.UTC(2026, 7, 25, 10, 0, 0),
  );
  const text = JSON.stringify(p);
  assert.ok(!text.includes('streng-geheim'), 'das Secret darf nirgends auftauchen');
  assert.equal(p.roles, 'shop');
  assert.equal(p.portal, 'portal1');
  assert.match(p.accessToken, /^[0-9a-f]{32}$/);
});
