/**
 * Grundregel 1 aus UEBERGABE.md Abschnitt 2 ist einer der beiden heikelsten
 * Codepfade. Diese Tests sichern ihn ab.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entfernePreisfelder, istPreisFeld } from '../lib/oxomi/preissperre.ts';

test('erkennt die Preisspalten des SAP-Exports', () => {
  for (const name of ['Nettopreis', 'Nettowert', 'Waehrung', 'Währung', 'Belegwaehrung', 'Preis']) {
    assert.equal(istPreisFeld(name), true, `${name} muss als Preisfeld gelten`);
  }
});

test('erkennt englische und abgekuerzte Preisfelder', () => {
  for (const name of ['price', 'listPrice', 'currency', 'discount', 'VAT', 'net', 'EK', 'UVP', 'total']) {
    assert.equal(istPreisFeld(name), true, `${name} muss als Preisfeld gelten`);
  }
});

test('haelt fachliche Merkmale frei', () => {
  for (const name of [
    'Nettogewicht',
    'Bruttogewicht',
    'Breite',
    'Hoehe',
    'Material',
    'Farbe',
    'Serie',
    'Steuerung',
    'Messwert',
    'Netzwerkanschluss',
    'Oberflaeche',
    'Montageart',
  ]) {
    assert.equal(istPreisFeld(name), false, `${name} darf kein Preisfeld sein`);
  }
});

test('entfernt Preise aus einer verschachtelten Antwort', () => {
  const roh = {
    itemNumber: '60133450',
    name: 'Waschtisch 600x480 mm',
    price: 249.9,
    prices: [{ amount: 249.9, currency: 'EUR' }],
    attributes: [
      { name: 'Breite', value: '600', unit: 'mm' },
      { name: 'Listenpreis', value: '249,90 EUR' },
    ],
    images: [{ url: 'https://oxomi.example/bild.jpg' }],
  };

  const sauber = entfernePreisfelder(roh) as Record<string, unknown>;
  const text = JSON.stringify(sauber);

  assert.equal(sauber.price, '[Preisfeld verworfen]');
  assert.ok(!text.includes('249.9'), 'kein Preisbetrag darf uebrig bleiben');
  assert.ok(!text.includes('249,90'), 'kein Preisbetrag darf uebrig bleiben');
  assert.ok(!text.includes('EUR'), 'keine Waehrung darf uebrig bleiben');
  assert.ok(text.includes('600'), 'fachliche Masse muessen erhalten bleiben');
  assert.ok(text.includes('bild.jpg'), 'Bilder muessen erhalten bleiben');
});

test('greift auch bei Name-Wert-Paaren, deren Name den Preis traegt', () => {
  const sauber = entfernePreisfelder({
    merkmale: [{ label: 'Nettopreis', wert: '199,00' }],
  }) as { merkmale: Array<Record<string, unknown>> };

  assert.equal(sauber.merkmale[0].wert, '[Preisfeld verworfen]');
});
