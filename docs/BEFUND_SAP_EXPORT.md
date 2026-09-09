# Befund: echte SAP-Angebotsexporte

Stand 25.08.2026. Grundlage: die vom Auftraggeber gelieferten Exporte in `testdaten/sap/`.
Dieses Dokument hält fest, was in den Dateien wirklich steht — Vorarbeit für Stufe T-C.
Es ändert nichts an `UEBERGABE.md`; wo dort eine Annahme stand, steht hier die Messung.

## 1. Was geliefert wurde

| Datei | Inhalt |
|---|---|
| `Feldhues_Neßler.XLSX` | Positionsexport zu Angebot 24284662, 76 Positionen |
| `Theben_Budde-Kleen.XLSX` | Positionsexport zum zweiten Vorgang |
| `Pietsch  Angebot 24284662   - Karola Neßler  Metel.PDF` | dasselbe Angebot als PDF |
| `Pietsch  Angebot 24244627   - Ehel  Budde-Kleen  B.PDF` | zweites Angebot als PDF |

`UEBERGABE.md` Abschnitt 12 hat diese Dateien noch als offen geführt. Sie liegen jetzt vor,
damit entfällt die Vorbedingung für den Abschluss von T-C.

## 2. Das tatsächliche Spaltenschema

Kopfzeile in Zeile 1, ab Zeile 2 die Positionen. Sechzehn Spalten, feste Reihenfolge:

| Spalte | Kopf | Bedeutung | Import |
|---|---|---|---|
| A | Verkaufsbeleg | SAP-Angebotsnummer, in jeder Zeile wiederholt | übernehmen |
| B | Position | Positionsnummer in Zehnerschritten | übernehmen |
| C | Material | Pietsch-Artikelnummer **oder** Textschlüssel | übernehmen |
| D | Bezeichnung | Bezeichnungszeile 1 | übernehmen |
| E | Bezeichnung 2 | Bezeichnungszeile 2: Maße, Farbe, Ausführung | übernehmen |
| F | Auftragsmenge | Menge | übernehmen |
| G | Verkaufsmengeneinh. | Einheit, durchgehend `ST` | übernehmen |
| H | Nettopreis | **Preis je Stück** | **verwerfen** |
| I | Währung | Preisbezug | **verwerfen** |
| J | Nettowert | **Positionswert** | **verwerfen** |
| K | Belegwährung | Preisbezug | **verwerfen** |
| L | Lieferantenmaterialnr. | **Werksnummer des Herstellers** | übernehmen |
| M | Angelegt am | Datum als SAP-Serienzahl | übernehmen |
| N | Bruttogewicht | Gewicht | optional |
| O | Nettogewicht | Gewicht | optional |
| P | Gewichtseinheit | `KG` | optional |

Vier Spalten sind zu verwerfen: H, I, J, K. Der Spalten-Zuordnungsassistent aus
`UEBERGABE.md` Abschnitt 7 bleibt trotzdem nötig, weil andere Ausstellungen oder ein
späterer SAP-Stand abweichen können. Das Verwerfen darf aber nie von der Zuordnung
abhängen: Erkennt der Assistent eine Spalte nicht, gilt sie im Zweifel als Preisspalte.

## 3. Zwei Befunde, die die Fachlogik betreffen

### 3.1 Es gibt keine Herstellerspalte — offener Punkt

Der Export liefert die Werksnummer (Spalte L), aber nirgends den Herstellernamen.
Die Matching-Kaskade Stufe 1 aus `UEBERGABE.md` Abschnitt 7 heißt „Hersteller + Werksnummer
direkt gegen OXOMI". Im Echtbetrieb steht davon nur die Hälfte zur Verfügung.

Drei Wege, keiner davon bisher entschieden:

1. **Werksnummer allein reicht OXOMI.** Wenn die Werksnummer im Portal eindeutig ist,
   braucht es den Hersteller nicht. Das misst der Testlauf T-A mit.
2. **Hersteller aus der Bezeichnung ableiten.** Die Bezeichnungen tragen ihn oft mit:
   `GE Renova Plan`, `VB Wand-Tiefspül-WC`, `SCALIDO`, `sanibel`, `more4YOU`. Kürzel wie
   `GE` (Geberit) und `VB` (Villeroy & Boch) sind hausüblich und lassen sich als Tabelle
   pflegen. Das ist eine Ableitung aus Daten, keine Erfindung — muss aber im Review
   sichtbar und korrigierbar sein.
3. **Zuordnung aus dem Artikel-Cache.** Sobald ein Artikel einmal zugeordnet wurde,
   liefert der Cache Hersteller und Werksnummer zur Pietsch-Nummer mit. Das ist der Weg,
   den `UEBERGABE.md` für Kaskadenstufe 2 vorsieht; er trägt erst mit wachsendem Bestand.

**Empfehlung:** 1 messen, 3 als Regelweg bauen, 2 als Rückfall mit sichtbarer Kennzeichnung.

### 3.2 Das Angebot trägt seine Gliederung schon in sich

In Spalte C stehen nicht nur Artikelnummern, sondern auch Textschlüssel:

| Schlüssel | Beispielinhalt in Spalte D | Bedeutung |
|---|---|---|
| `TITEL` | `Bad` | Überschrift des Vorgangs |
| `HINWEIS` | `WT-Anlage:` | **Bereichsüberschrift, vom Badverkäufer selbst gesetzt** |
| `FACHBERATUNG` | `Konzeption und Planung, je Stunde` | Dienstleistung, kein Artikel |
| `BADPLANUNG` | `3-D Badplanung für MODUL Partner` | Dienstleistung, kein Artikel |
| `Z…` | `more4YOU Eqio WT inkl. WTU, 2 Auszüge` | Sonderartikel ohne Katalognummer |

Das ist der wertvollste Fund in den Dateien. Die `HINWEIS`-Zeilen sind eine Kapitelzuordnung
von Menschenhand: Der Badverkäufer hat das Angebot beim Schreiben bereits in Bereiche
gegliedert. Für die Kapitelzuordnung ist das belastbarer als jede Ableitung aus eCl@ss
oder Bezeichnung.

**Folge für T-C:** Der Importer liest die `HINWEIS`-Zeilen als Bereichsmarken mit und ordnet
alle folgenden Positionen dem zuletzt genannten Bereich zu, bis die nächste Marke kommt.
eCl@ss und Bezeichnung bleiben als Ergänzung für Positionen vor der ersten Marke und zur
Gegenprüfung. `TITEL`, `HINWEIS`, `FACHBERATUNG` und `BADPLANUNG` sind keine Artikel und
gehen nicht in die Positionsliste.

Die `Z`-Nummern sind vermutlich genau die Individualartikel aus Kaskadenstufe 4
(`Z00005013` = `more4YOU Eqio WT inkl. WTU`, mit Werksnummer `SEYR103F6584G0200`, aber ohne
Katalogartikel). **Annahme, nicht bestätigt** — vor T-C mit dem Auftraggeber klären.

## 4. Was das für T-C bedeutet

- Der Import braucht eine Positionsklassifikation vor dem Matching: Artikel, Bereichsmarke,
  Dienstleistung, Sonderartikel.
- Der Test „Preisspalten nachweislich verworfen" lässt sich jetzt gegen echte Dateien fahren,
  nicht gegen ein angenommenes Schema.
- Die Kapitelzuordnung startet mit einer besseren Grundlage als geplant.
