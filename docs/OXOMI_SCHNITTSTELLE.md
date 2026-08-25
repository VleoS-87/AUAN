# OXOMI-Schnittstelle: gemessener Stand

Stand 25.08.2026. Alles in diesem Dokument wurde im Kalibrierlauf gegen das echte
Pietsch-Portal gemessen, nicht aus der Dokumentation abgeleitet. Wo etwas offen ist,
steht es ausdrücklich als offen.

## 1. Anmeldung

Verfahren INT63, wie in `UEBERGABE.md` Abschnitt 5 beschrieben:

```
accessToken = md5(secret + md5(secret + portal + user + expires + roles))
```

Zwei Punkte, an denen der erste Bauversuch danebenlag und die jetzt belegt sind:

| Punkt | Falsche Annahme | Gemessener Stand |
|---|---|---|
| `expires` | Zeitstempel des Tagesbeginns (z. B. `1787702400`) | **Tagesnummer**: Zeitstempel in Sekunden ganzzahlig geteilt durch 86400, also `20690` für den 25.08.2026 |
| `expires` als Parameter | wird mitgeschickt | wird **nicht** mitgeschickt — OXOMI leitet die Tagesnummer selbst ab und lässt eine Toleranz über den Datumswechsel zu |

Die Portal-Angabe ist in dieser Umgebung als vollständige Portaladresse hinterlegt
(`https://oxomi.com/p/…`). OXOMI erwartet im Aufruf die **Kennung** daraus; mit der
vollen Adresse antwortet es `400 Unknown Portal`. Die Kennung wird deshalb in
`lib/oxomi/config.ts` herausgelöst.

Gemessene Toleranz: Die Anmeldung wurde in allen zwölf geprüften Varianten akzeptiert
(Tagesnummer −1, 0 und +1; Rollen mitgeschickt oder weggelassen; `expires`
mitgeschickt oder weggelassen). AUAN benutzt die saubere Variante: Tagesnummer von
heute, Rollen mitgeschickt, `expires` weggelassen.

## 2. Dienstpfade

Die Dienste liegen **nicht** unter `/service/json/…`, wie zunächst vermutet, sondern:

| Pfad | Verfahren | Zweck |
|---|---|---|
| `/portals/api/v1/products/resolve-gtin` | GET, Parameter `gtin` | EAN auflösen → `supplierNumber` + `supplierItemNumber` |
| `/portals/api/v2/product/data` | POST, JSON-Rumpf | Produktdaten, bis zu 30 Artikel je Aufruf |
| `/portals/api/v1/product/data` | GET, `itemNumber1` **und** `supplierNumber1` (beide Pflicht) | ältere Variante, von AUAN nicht genutzt |
| `/portals/api/v1/product/datasheet/render` | — | Datenblatt als Dokument, noch nicht ausgewertet |
| `/portals/api/v1/documents` | — | Dokumente, noch nicht ausgewertet |

## 3. Der Schlüssel zum Artikel ist die EAN

`resolve-gtin` liefert zu einer EAN die OXOMI-eigene Lieferantennummer und die
Artikelnummer dieses Lieferanten. Ergebnis für die fünf Testartikel:

| Pietsch-Nr. | Art | OXOMI-Lieferant | OXOMI-Artikelnr. | = Werksnummer? |
|---|---|---|---|---|
| 083054001 | Marke (Geberit/Keramag) | 16060 | 501632001 | ja |
| 054107001 | Eigenmarke aktiv4YOU (Hansgrohe) | 16360 | 60133450 | ja |
| 073282001 | Eigenmarke sanibel (VitrA) | 16417 | 7306018 | **nein** |
| 015250001 | Marke (Villeroy & Boch) | 31112 | 5660R001 | ja |
| 083745000 | Eigenmarke sanibel (burgbad) | 16417 | 8243820 | **nein** |

**Der wichtigste Befund:** Bei den Eigenmarken führt OXOMI die Artikel unter der
Lieferantennummer der Eigenmarken-Gesellschaft (16417) mit eigenen Artikelnummern.
Die Werksnummer des Fertigers passt dort nicht. Die EAN ist der einzige Schlüssel,
der bei Marken- **und** Eigenmarkenware zuverlässig trifft.

Der Herstellername taugt nicht als Lieferantenangabe: OXOMI erwartet dort seine
eigene Nummer. AUAN merkt sich deshalb bei jeder erfolgreichen EAN-Auflösung die
Zuordnung Hersteller → Lieferantennummer (Tabelle `oxomi_lieferant`). Ab dann findet
auch ein Artikel ohne EAN über Werksnummer plus gelernte Lieferantennummer.

## 4. Was die Produktauskunft liefert

Abfragearten, die dieses Portal kennt:

| Abfrage | Inhalt | wird genutzt |
|---|---|---|
| `features` | **Klassifikation und Merkmale** im ETIM-Schema | ja, als Faktenbasis |
| `product-images` | Bilder, je Bild vier Auflösungen plus Originaldatei | ja |
| `texts` | Kurzbeschreibung, Artikelbeschreibung, Langtext | ja |
| `attachments` | Anhänge und Dokumente | ja |
| `pages` | Prospektseiten | ja |
| `videos` | Hersteller- und Produktvideos | nein |
| `cover` | Titelbild-Kennzeichen | nein |
| `properties` | Gefahrgut, Zolltarif, Lieferzeit, WEEE, Verkaufsinformationen | **nein, bewusst nicht** |

`properties` bleibt draußen: Nichts davon gehört in eine Kundenmappe, und der
Block trägt Verkaufsdaten.

Abfragearten, die dieses Portal **nicht** kennt (Antwort „Cannot find … of type
ProductDataProvider"): `eclass`, `classification`, `attributes`, `etim` (unter
diesem Namen), `details`, `product-details`, `product-texts`, `brand`, `series`,
`catalogs`, `datasheet`, `documents`, `technical-data` und 20 weitere geprüfte
Schreibweisen.

### 4.1 Bilder

Je Bild liefert OXOMI: `iconUrl` (Sinnbild), `previewImageUrl`, `mediumImageUrl`,
`hdImageUrl` und `downloadUrl` (Originaldatei, häufig EPS). AUAN nimmt `hdImageUrl`
als Anzeige- und Druckbild und merkt sich `downloadUrl` als Originalquelle — ein
EPS zeigt kein Browser an, für die Druckerei ist es aber die beste Vorlage.

Bilder tragen eine Art: `COLORED_IMAGE` („Produktbild") und `MEASURED_DRAWING`
(„Vermaßte Strichzeichnung"). AUAN markiert Maßzeichnungen getrennt, weil sie in der
Mappe gesammelt auf eine eigene Seite hinten gehören und nicht neben den Artikel.

### 4.2 Klassifikation und Merkmale — die eigentliche Faktenbasis

Die Abfrage `features` liefert die Klassifikation des Artikels **und** seine
Merkmale als saubere Name/Wert-Paare mit Schlüssel:

```json
{
  "class": { "code": "EC011550", "name": "Waschbecken", "system": "metaclass" },
  "features": [
    { "code": "EF004567", "name": "Breite/Durchmesser", "value": "550 mm" },
    { "code": "EF000049", "name": "Tiefe",              "value": "440 mm" },
    { "code": "EF000003", "name": "Montageart",         "value": "Wand" },
    { "code": "EF002169", "name": "Werkstoff",          "value": "Keramik" },
    { "code": "EF000007", "name": "Farbe",              "value": "weiß" }
  ]
}
```

`EC…` und `EF…` sind **ETIM**-Schlüssel; OXOMI führt das System als `metaclass`.
Das Fachkonzept hatte an dieser Stelle eCl@ss vorgesehen — ETIM erfüllt denselben
Zweck und ist im SHK-Bereich die verbreitetere Klassifikation.

Gemessene Klassen der fünf Testartikel:

| Klasse | Klartext | Kapitel |
|---|---|---|
| `EC011550` | Waschbecken | Waschtischanlage |
| `EC011382` | Waschtischunterschrank | Waschtischanlage |
| `EC011289` | WC | WC-Anlage |

Die Werte werden unverändert übernommen. Ausgelassen wird nur: Merkmale ohne
Namen oder Wert, Preisfelder (Grundregel 1) und Dubletten.

**Rückfall Beschreibungstext.** Fehlt die Klassifikation zu einem Artikel, liest
AUAN die Merkmale aus dem Feld `normalizedText` der Artikelbeschreibung, das
OXOMI bereits zeilenweise gegliedert mitliefert (Zeilen der Form `Merkmal: Wert`).
Jedes Merkmal trägt am Ergebnis seine Herkunft — im Review und in der Mappe ist
das der Unterschied zwischen belegt und abgeleitet.

## 5. Offene Punkte

| Punkt | Stand | Wirkung |
|---|---|---|
| **eCl@ss** | Nicht verfügbar — dafür ETIM über `features`, gemessen bei 5 von 5 Testartikeln. | Erledigt. Die Kapitelzuordnung stützt sich auf den ETIM-Klassenschlüssel; die Tabelle ist mit den gemessenen Klassen gefüllt. |
| **EAN im SAP-Export** | Der SAP-Export enthält keine EAN-Spalte (siehe `BEFUND_SAP_EXPORT.md`). | Der sicherste Suchweg steht im Echtbetrieb zunächst nicht zur Verfügung. Drei Wege: EAN in den Export aufnehmen, EAN aus den Stammdaten nachschlagen, oder über die gelernten Lieferantennummern gehen. **Vor T-C zu entscheiden.** |
| **Volltextsuche** | `/portals/api/v2/products/search` antwortet auf alle geprüften Rumpfformen mit „Es wurde keine Suchanfrage übermittelt". | Der Parametername ist noch unbekannt. Nicht kritisch, solange die EAN trägt. |
| **Datenblatt-Dienst** | `/portals/api/v1/product/datasheet/render` ist vorhanden, aber nicht ausgewertet. | Seit die Klassifikation trägt, nicht mehr nötig. Bleibt als Reserve. |
| **Product Sync API** | Vorhanden, mit Blöcken `DETAILS, CLASSIFICATIONS, FEATURES, PROPERTIES, TEXTS, IMAGES, ATTACHMENTS, PRICES, RELATIONSHIPS, MEASUREMENTS, PACKAGES`. Liefert jeweils nur die seit dem letzten Abruf geänderten Artikel. | Interessant für den Aktualisierungslauf des Artikel-Caches (UEBERGABE.md Abschnitt 5). Der Block `PRICES` wird nie angefordert. |
