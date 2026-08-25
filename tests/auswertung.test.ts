/**
 * Auswertung einer OXOMI-Produktantwort.
 *
 * Die Testdaten sind gekuerzte, aber wortgetreue Ausschnitte aus der echten
 * Antwort des Pietsch-Portals zum Artikel 083054001 (Geberit Renova Plan
 * Waschtisch), aufgezeichnet im Kalibrierlauf vom 25.08.2026. Preisangaben
 * sind bewusst hinzugefuegt, um die Preissperre mitzupruefen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { werteProduktAus } from '../lib/oxomi/auswertung.ts';
import { entfernePreisfelder } from '../lib/oxomi/preissperre.ts';
import type { OxomiProdukt } from '../lib/oxomi/endpunkte.ts';

const NORMALISIERTER_TEXT = [
  'Geberit Renova Plan Waschtisch',
  'Verwendungszwecke',
  'Zum Einbau in Sanitärräumen',
  'Eigenschaften',
  'Unterbaufähig',
  'Reduzierte Randhöhe',
  'Farbe / Oberfläche',
  'Farbe: weiß',
  'Technische Eigenschaften',
  'Werkstoff: Sanitärkeramik',
  'Hahnloch: mittig',
  'Überlauf: sichtbar, symmetrisch',
  'B / Breite (cm): 55 cm',
  'H / Höhe (cm): 18 cm',
  'T / Tiefe (cm): 44 cm',
  'Befestigungspunkte: 2',
  'Listenpreis: 249,00 EUR',
].join('\n');

const PRODUKT: OxomiProdukt = {
  productId: 'LKJ1VGCKGFSD9C9RNR2HIQF3HK',
  supplierNumber: '16060',
  itemNumber: '501632001',
  resolved: true,
  queries: {
    'product-images': {
      type: 'json',
      error: false,
      images: [
        {
          type: 'COLORED_IMAGE',
          typeName: 'Produktbild',
          description: 'Produktbild',
          filename: 'geb_d_1832254.eps',
          iconUrl: 'https://oxomi.com/shared-media/epoch/x/oxomi/attachments/other.png',
          downloadUrl: 'https://oxomi.com/dasd/pd/attachments/a/b/c/geb_d_1832254.eps',
          previewImageUrl: 'https://oxomi.com/dasd/p/attachments/a/b/klein.jpg',
          mediumImageUrl: 'https://oxomi.com/dasd/p/attachments/a/b/mittel.jpg',
          hdImageUrl: 'https://oxomi.com/dasd/p/attachments/a/b/gross.jpg',
          fingerprint: 'JQVKNRV049TA88O79J3BT2M9LS',
          fileSizeInBytes: 1825294,
        },
        {
          type: 'MEASURED_DRAWING',
          typeName: 'Vermaßte Strichzeichnung',
          description: 'Masszeichnung Draufsicht',
          filename: 'gev_w_4212095.jpg',
          hdImageUrl: 'https://oxomi.com/dasd/p/attachments/c/d/zeichnung.jpg',
          fingerprint: '8A85G1MO5N1F85BJ2V7C9BN7EO',
        },
      ],
    },
    texts: {
      type: 'json',
      error: false,
      texts: [
        {
          type: 'SHORT_DESCRIPTION',
          typeName: 'Artikelkurzbeschreibung',
          optimizedText:
            'Geberit Renova Plan Waschtisch: 55x44cm, Hahnloch=mittig, Überlauf=sichtbar, symmetrisch, weiß',
        },
        {
          type: 'DESCRIPTION',
          typeName: 'Artikelbeschreibung (HTML)',
          optimizedText: '<span>Geberit Renova Plan Waschtisch</span>',
          normalizedText: NORMALISIERTER_TEXT,
        },
      ],
    },
    attachments: { type: 'json', error: false, attachments: [] },
  },
};

test('erkennt den Treffer und die OXOMI-Kennung', () => {
  const a = werteProduktAus(PRODUKT);
  assert.equal(a.gefunden, true);
  assert.equal(a.bezeichnung?.startsWith('Geberit Renova Plan Waschtisch'), true);
  assert.equal(a.hersteller, 'Geberit');
});

test('nimmt die hoechste Bildaufloesung und haelt die Originaldatei fest', () => {
  const a = werteProduktAus(PRODUKT);
  const produktbild = a.bilder.find((b) => !b.istMasszeichnung);
  assert.equal(produktbild?.url, 'https://oxomi.com/dasd/p/attachments/a/b/gross.jpg');
  assert.equal(produktbild?.originalUrl, 'https://oxomi.com/dasd/pd/attachments/a/b/c/geb_d_1832254.eps');
  assert.equal(produktbild?.art, 'Produktbild');
});

test('trennt Maßzeichnungen vom Produktbild und sortiert sie nach hinten', () => {
  const a = werteProduktAus(PRODUKT);
  assert.equal(a.bilder.length, 2);
  assert.equal(a.bilder[0].istMasszeichnung, false);
  assert.equal(a.bilder[1].istMasszeichnung, true);
  assert.equal(a.bilder[1].titel, 'Masszeichnung Draufsicht');
});

test('liest die Merkmale aus dem Beschreibungstext', () => {
  const a = werteProduktAus(PRODUKT);
  const alsKarte = Object.fromEntries(a.fakten.map((f) => [f.name, f.wert]));

  assert.equal(alsKarte['Farbe'], 'weiß');
  assert.equal(alsKarte['Werkstoff'], 'Sanitärkeramik');
  assert.equal(alsKarte['Hahnloch'], 'mittig');
  assert.equal(alsKarte['Befestigungspunkte'], '2');
});

test('kuerzt die Beschriftung, laesst den Wert aber unangetastet', () => {
  const a = werteProduktAus(PRODUKT);
  const breite = a.fakten.find((f) => f.name === 'Breite');
  assert.ok(breite, '"B / Breite (cm)" muss zu "Breite" werden');
  assert.equal(breite.wert, '55 cm', 'der Wert bleibt genau so, wie OXOMI ihn liefert');
});

test('haelt Preisangaben aus den Fakten heraus', () => {
  const a = werteProduktAus(PRODUKT);
  assert.equal(
    a.fakten.some((f) => /preis/i.test(f.name)),
    false,
    'kein Preisfeld darf als Fakt durchkommen',
  );
  assert.equal(
    a.fakten.some((f) => f.wert.includes('249')),
    false,
    'kein Preisbetrag darf als Wert durchkommen',
  );
});

test('die Preissperre greift schon auf der Rohantwort', () => {
  const roh = {
    products: [{ itemNumber: '501632001', listPrice: 249, attributes: [{ name: 'Breite', value: '55 cm' }] }],
  };
  const sauber = JSON.stringify(entfernePreisfelder(roh));
  assert.ok(!sauber.includes('249'));
  assert.ok(sauber.includes('55 cm'));
});

test('freie Eigenschaften landen getrennt von den Merkmalen', () => {
  const a = werteProduktAus(PRODUKT);
  assert.ok(a.eigenschaften.includes('Unterbaufähig'));
  assert.ok(a.eigenschaften.includes('Reduzierte Randhöhe'));
  assert.equal(
    a.fakten.some((f) => f.name === 'Unterbaufähig'),
    false,
  );
});

test('ein nicht aufgeloester Artikel liefert nichts', () => {
  const a = werteProduktAus({ itemNumber: '999', resolved: false, queries: {} });
  assert.equal(a.gefunden, false);
  assert.equal(a.bilder.length, 0);
  assert.equal(a.fakten.length, 0);
});
