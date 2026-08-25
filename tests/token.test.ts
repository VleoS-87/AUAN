/**
 * Token-Verfahren INT63:
 *   accessToken = md5(secret + md5(secret + portal + user + expires + roles))
 *
 * `expires` ist die TAGESNUMMER: Zeitstempel in Sekunden ganzzahlig geteilt
 * durch 86400. Belegt durch die OXOMI-Dokumentation, die als Beispielwert
 * "20690" nennt - das ist der 25.08.2026, der Tag der Kalibrierung.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { baueZugangsparameter, berechneAccessToken, berechneExpires } from '../lib/oxomi/token.ts';

const md5 = (t: string) => createHash('md5').update(t, 'utf8').digest('hex');

test('bildet den Token genau nach der Formel', () => {
  const e = { secret: 'geheim', portal: 'portal1', user: 'nutzer', expires: 20690, rollen: 'shop' };
  const erwartet = md5('geheim' + md5('geheimportal1nutzer20690shop'));
  assert.equal(berechneAccessToken(e), erwartet);
});

test('expires ist die Tagesnummer, nicht der Zeitstempel', () => {
  // Der von OXOMI dokumentierte Beispielwert.
  assert.equal(berechneExpires(Date.UTC(2026, 7, 25, 12, 34, 56)), 20690);
  assert.equal(berechneExpires(Date.UTC(2026, 7, 26, 0, 0, 0)), 20691);
});

test('die Tagesnummer bleibt einen ganzen Tag stabil', () => {
  const frueh = Date.UTC(2026, 7, 25, 0, 0, 1);
  const spaet = Date.UTC(2026, 7, 25, 23, 59, 59);
  assert.equal(berechneExpires(frueh), berechneExpires(spaet));
});

test('die Zugangsparameter enthalten nie das Shared Secret und kein expires', () => {
  const p = baueZugangsparameter(
    { portal: 'portal1', user: 'nutzer', secret: 'streng-geheim', rollen: 'shop' },
    Date.UTC(2026, 7, 25, 10, 0, 0),
  );
  const text = JSON.stringify(p);
  assert.ok(!text.includes('streng-geheim'), 'das Secret darf nirgends auftauchen');
  assert.ok(!('expires' in p), 'expires wird nicht mitgeschickt, es steckt nur im Token');
  assert.equal(p.roles, 'shop');
  assert.equal(p.portal, 'portal1');
  assert.match(p.accessToken, /^[0-9a-f]{32}$/);
});

test('ohne Rollen wird der Parameter weggelassen und leer gehasht', () => {
  const zeit = Date.UTC(2026, 7, 25, 10, 0, 0);
  const p = baueZugangsparameter(
    { portal: 'portal1', user: 'nutzer', secret: 'geheim', rollen: '' },
    zeit,
  );
  assert.ok(!('roles' in p), 'ohne Rollen darf der Parameter nicht mitgeschickt werden');
  assert.equal(
    p.accessToken,
    berechneAccessToken({
      secret: 'geheim',
      portal: 'portal1',
      user: 'nutzer',
      expires: berechneExpires(zeit),
      rollen: '',
    }),
  );
});
