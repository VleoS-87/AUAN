# Stufe T-A: Ergebnis

Stand 25.08.2026. Abnahmekriterium aus `UEBERGABE.md` Abschnitt 13:

> Alle 5 Testartikel laufen über die deployte Testroute durch; je Artikel:
> Trefferstatus, Bilder, Fakten, eCl@ss sichtbar; Trefferquote und Lücken dokumentiert.

## 1. Gemessenes Ergebnis

Gemessen gegen das echte OXOMI-Portal mit den fünf Artikeln aus
`testdaten/artikel/artikel_testliste.csv`, davon drei Eigenmarken.

| Kennzahl | Ergebnis |
|---|---|
| Artikel in OXOMI gefunden | **5 von 5 (100 %)** |
| mit mindestens einem Produktbild | **5 von 5** |
| mit Maßzeichnung | **5 von 5** |
| mit Merkmalen (Faktenbasis) | **5 von 5** |
| mit Kapitelvorschlag | **5 von 5** |
| mit eCl@ss-Klassifikation | **0 von 5** |
| Dauer, erster Lauf gegen OXOMI | 3,2 Sekunden für 5 Artikel |
| Dauer, zweiter Lauf aus dem Cache | 0,5 Sekunden — kein einziger OXOMI-Aufruf |

## 2. Je Artikel

| Pietsch-Nr. | Art | Status | OXOMI-Kennung | Bilder | Maßz. | Merkmale | Kapitelvorschlag |
|---|---|---|---|---|---|---|---|
| 083054001 Geberit Renova Plan Waschtisch | Marke | Treffer | 16060 / 501632001 | 1 | 3 | 9 | Waschtischanlage |
| 054107001 aktiv4YOU Waschtisch | Eigenmarke | Treffer | 16360 / 60133450 | 9 | 3 | 6 | Waschtischanlage |
| 073282001 sanibel care Waschtisch | Eigenmarke | Treffer | 16417 / 7306018 | 1 | 3 | 6 | Waschtischanlage |
| 015250001 V&B O.novo Wand-WC | Marke | Treffer | 31112 / 5660R001 | 6 | 1 | 30 | WC-Anlage |
| 083745000 sanibel WT-Unterschrank | Eigenmarke | Treffer | 16417 / 8243820 | 1 | 4 | 8 | Waschtischanlage |

Beispiel für die Faktenqualität (Geberit Renova Plan):
`Farbe = weiß`, `Werkstoff = Sanitärkeramik`, `Hahnloch = mittig`,
`Überlauf = sichtbar, symmetrisch`, `Breite = 55 cm`, `Tiefe = 44 cm`.
Alle Werte stammen unverändert aus den OXOMI-Daten.

## 3. Lücken

| Lücke | Bewertung | Nächster Schritt |
|---|---|---|
| **Keine eCl@ss-Klassifikation** | Das Portal liefert sie nicht (gemessen: alle Klassifikationsabfragen antworten „Cannot find … of type ProductDataProvider"). Das Fachkonzept hatte eCl@ss als strukturierte Grundlage der Kapitelzuordnung vorgesehen. | Die Kapitelzuordnung stützt sich auf die Artikelbezeichnung und trifft bei allen fünf Testartikeln richtig. Ob eCl@ss über einen erweiterten OXOMI-Vertrag verfügbar wäre, ist mit OXOMI zu klären. Bis dahin bleibt die Zuordnungstabelle leer statt erfunden. |
| **Der SAP-Export enthält keine EAN** | Die EAN ist der einzige Schlüssel, der bei Marken- und Eigenmarkenware zuverlässig trifft. Im Echtbetrieb steht sie zunächst nicht zur Verfügung. | Vor T-C zu entscheiden — siehe Abschnitt 4. |
| **Nur ein Produktbild bei drei Artikeln** | Für eine Mappenseite reicht ein gutes Produktbild, für eine Bildauswahl im Review nicht. | In T-C im Review sichtbar machen und eigenen Upload zulassen, wie im Fachkonzept ohnehin vorgesehen. |
| **Merkmalstexte sind je Hersteller unterschiedlich aufgebaut** | Villeroy & Boch liefert 30 teils redaktionelle Merkmale, Geberit 9 saubere technische. Der Baustein liest beide, die Auswahl fürs Exposé fehlt noch. | In T-D: Die Faktenzeile zeigt 4 bis 6 kuratierte Angaben, nicht alle. |

## 4. Der eine Punkt, der eine Entscheidung braucht

**Die EAN fehlt im SAP-Export.**

Der Weg zum Artikel führt über die EAN: Sie löst in OXOMI die Lieferantennummer und
die Artikelnummer auf. Das funktioniert bei Markenware und bei Eigenmarken gleich gut —
und Eigenmarken sind der schwierige Fall, weil OXOMI sie unter eigenen Nummern führt,
die von der Werksnummer des Fertigers abweichen (belegt bei zwei der fünf Testartikel).

Der SAP-Export (`testdaten/sap/`) enthält Pietsch-Artikelnummer, Bezeichnung, Menge und
Werksnummer — aber keine EAN.

Drei Wege, in der Reihenfolge unserer Empfehlung:

1. **EAN in den SAP-Export aufnehmen.** Eine zusätzliche Spalte. Sauberster Weg,
   erfordert eine Anpassung am Export.
2. **EAN aus den Stammdaten nachschlagen.** Falls eine Artikelstammdatenquelle
   verfügbar ist, die Pietsch-Nummer auf EAN abbildet.
3. **Über die gelernte Lieferantennummer gehen.** Der Baustein merkt sich bei jeder
   EAN-Auflösung die Zuordnung Hersteller → OXOMI-Lieferantennummer und findet
   danach auch Artikel ohne EAN über die Werksnummer. Trägt aber erst mit
   wachsendem Bestand und nicht bei Eigenmarken mit abweichender Nummer.

Weg 3 ist bereits gebaut und läuft mit. Er ersetzt Weg 1 oder 2 nicht.

## 5. Was gebaut wurde

- **`lib/oxomi/`** — der Anreicherungsbaustein als eigenständiges Modul, ohne
  Abhängigkeit zum übrigen AUAN-Code und ohne Pfad-Alias, damit die Kojen-Plattform
  ihn später unverändert mitnutzen kann.
- **Artikel-Cache** (`artikel_cache`) — jedes Ergebnis wird dauerhaft gespeichert.
  Gemessen: zweiter Lauf 0,5 statt 3,2 Sekunden, kein einziger OXOMI-Aufruf.
- **Lieferanten-Zuordnung** (`oxomi_lieferant`) — lernt bei jeder EAN-Auflösung dazu.
- **Drosselung und Wiederholungslogik** — ein langsames OXOMI verzögert, bricht nicht ab.
- **Testroute `/dev/oxomi-test`** — nur mit Schlüsselparameter, zeitkonstant gegen
  `APP_SECRET` geprüft.
- **35 Tests** auf den heiklen Pfaden: Preissperre, Token-Verfahren, Cache-Schlüssel,
  Merkmalsauswertung, Kapitelzuordnung, Zugriffsschutz.

## 6. Grundregeln

| Regel | Umsetzung |
|---|---|
| Keine Preise | Die Preissperre greift auf jede OXOMI-Antwort, bevor etwas gespeichert oder angezeigt wird — nicht erst beim SAP-Import. Sechs Tests sichern den Pfad, darunter der Fall, in dem der Preis erst im Merkmalsnamen steckt. |
| Bilder nur aus lizenzierten Quellen | Alle Bilder stammen aus der OXOMI-Antwort und tragen einen Quellenvermerk. Es gibt keinen anderen Bildweg im Baustein. |
| Fakten nur aus Daten | Merkmale werden aus den OXOMI-Texten übernommen, nie formuliert. Der Wert bleibt unverändert; nur die Beschriftung wird gekürzt. Die eCl@ss-Tabelle bleibt leer, weil keine Daten vorliegen. |
| Datensparsamkeit | Der Baustein verarbeitet ausschließlich Artikeldaten, keine Kundendaten. |
| Keine Secrets | Zugangsdaten stehen nur in Vercel. Jede Diagnoseausgabe ersetzt Token, Portal-Kennung und Benutzer. |
