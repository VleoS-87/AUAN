# SAP-Angebotsexporte (Testdaten)

Echte Exporte aus SAP, vom Auftraggeber geliefert. Grundlage für T-C (Import + Matching + Review).

**Achtung:** Diese Dateien enthalten bewusst Preisspalten. Der Importer muss sie erkennen und
verwerfen, bevor irgendetwas gespeichert wird (UEBERGABE.md Abschnitt 2, Grundregel 1).

## Gelesenes Spaltenschema

Befund aus `Feldhues_Neßler.XLSX` (Kopfzeile in Zeile 1, ab Zeile 2 Positionen):

| Spalte | Kopf | Bedeutung | Import |
|---|---|---|---|
| A | Verkaufsbeleg | SAP-Angebotsnummer | übernehmen |
| B | Position | Positionsnummer (10, 20, 30 …) | übernehmen |
| C | Material | Pietsch-Artikelnummer **oder** Textschlüssel (`TITEL`, `HINWEIS`, `FACHBERATUNG`, `BADPLANUNG`, `Z…`) | übernehmen |
| D | Bezeichnung | Bezeichnungszeile 1 | übernehmen |
| E | Bezeichnung 2 | Bezeichnungszeile 2 (Maße, Farbe, Ausführung) | übernehmen |
| F | Auftragsmenge | Menge | übernehmen |
| G | Verkaufsmengeneinh. | Einheit (ST) | übernehmen |
| H | Nettopreis | **Preis** | **VERWERFEN** |
| I | Währung | Preisbezug | **VERWERFEN** |
| J | Nettowert | **Preis** | **VERWERFEN** |
| K | Belegwährung | Preisbezug | **VERWERFEN** |
| L | Lieferantenmaterialnr. | **Werksnummer des Herstellers** | übernehmen (Matching Stufe 1) |
| M | Angelegt am | Datum (SAP-Serial) | übernehmen |
| N | Bruttogewicht | Gewicht | optional |
| O | Nettogewicht | Gewicht | optional |
| P | Gewichtseinheit | KG | optional |

## Zwei Befunde, die die Fachlogik betreffen

1. **Es gibt keine Herstellerspalte.** Der Export liefert die Werksnummer (Spalte L), aber nicht
   den Hersteller. Die Matching-Kaskade Stufe 1 („Hersteller + Werksnummer") hat damit im
   Echtbetrieb nur die halbe Eingabe. Auflösung offen — siehe `docs/BEFUND_SAP_EXPORT.md`.
2. **Das Angebot trägt seine Gliederung schon in sich.** Positionen mit Material `TITEL` und
   `HINWEIS` sind keine Artikel, sondern Überschriften des Badverkäufers (Beispiel: `WT-Anlage:`).
   Sie sind für die Kapitelzuordnung wertvoller als jede Schätzung und dürfen nicht als Artikel
   importiert werden.

Beide Punkte sind in T-C zu berücksichtigen.
