import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schlageKapitelVor } from '../lib/oxomi/kapitel.ts';

test('ordnet die fuenf Testartikel richtig zu', () => {
  const faelle: Array<[string, string]> = [
    ['GE Renova Plan Waschtisch, 55x44cm m. Hl., m. Ül., weiß, NEU', 'Waschtischanlage'],
    ['Waschtisch 600x480 mm, m. HL u. ÜL aktiv4YOU Hansgrohe, weiß', 'Waschtischanlage'],
    ['sanibel care Waschtisch unterfahrbar m.HL, m.ÜL 650x560mm A14 weiß', 'Waschtischanlage'],
    ['VB Wand-Tiefspül-WC spülrandlos O.novo 360x560mm DirectFlush weiß', 'WC-Anlage'],
    ['sanibel WT-Unterschrank 2.0 FLEX WVXW060 zu Konsole 600x300x540mm Graphit Matt', 'Waschtischanlage'],
  ];

  for (const [bezeichnung, erwartet] of faelle) {
    assert.equal(schlageKapitelVor({ bezeichnung }).kapitel, erwartet, bezeichnung);
  }
});

test('der laengere Treffer gewinnt', () => {
  assert.equal(schlageKapitelVor({ bezeichnung: 'Duschwanne 90x90' }).kapitel, 'Duschanlage');
  assert.equal(schlageKapitelVor({ bezeichnung: 'Badewanne 180x80' }).kapitel, 'Wannenanlage');
  assert.equal(
    schlageKapitelVor({ bezeichnung: 'Geberit Spülkasten UP320' }).kapitel,
    'Unterputztechnik',
  );
});

test('ohne Anhaltspunkt gibt es keinen Vorschlag statt eines geratenen', () => {
  const v = schlageKapitelVor({ bezeichnung: 'Zubehoerbeutel 4-teilig' });
  assert.equal(v.kapitel, null);
  assert.equal(v.grundlage, 'kein_vorschlag');
});

test('der Klassenschluessel hat Vorrang vor der Bezeichnung', () => {
  const v = schlageKapitelVor({
    klassifikationCode: 'EC011550',
    klassifikationBezeichnung: 'Waschbecken',
    bezeichnung: 'Irgendein WC',
  });
  assert.equal(v.kapitel, 'Waschtischanlage');
  assert.equal(v.grundlage, 'klassifikation');
  assert.equal(v.beleg, 'EC011550');
});

test('bei unbekanntem Schluessel traegt der Klartext der Klasse', () => {
  const v = schlageKapitelVor({
    klassifikationCode: 'EC999999',
    klassifikationBezeichnung: 'Waschbecken',
    bezeichnung: null,
  });
  assert.equal(v.kapitel, 'Waschtischanlage');
  assert.equal(v.grundlage, 'klassenname');
});

test('ohne Klassifikation bleibt die Bezeichnung als Rueckfall', () => {
  const v = schlageKapitelVor({ bezeichnung: 'VB Wand-Tiefspül-WC spülrandlos' });
  assert.equal(v.kapitel, 'WC-Anlage');
  assert.equal(v.grundlage, 'bezeichnung');
});

test('die gemessenen Klassen sind eingetragen', () => {
  const faelle: Array<[string, string]> = [
    ['EC011550', 'Waschtischanlage'],
    ['EC011382', 'Waschtischanlage'],
    ['EC011289', 'WC-Anlage'],
  ];
  for (const [code, erwartet] of faelle) {
    const v = schlageKapitelVor({ klassifikationCode: code });
    assert.equal(v.kapitel, erwartet, code);
    assert.equal(v.grundlage, 'klassifikation', code);
  }
});
