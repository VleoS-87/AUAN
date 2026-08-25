# AUAN – Übergabe an Claude Code

Stand 25.08.2026. Dieses Dokument ist die verbindliche Arbeitsgrundlage für den MVP-Bau. Bei Detailfragen: `docs/KONZEPT_FACH.md` (Fachkonzept V1) und `docs/KONZEPT_TECHNIK.md` (Technikkonzept V1) enthalten die Volltexte. Widerspricht etwas dieser Datei, gilt diese Datei (sie ist der neueste Stand nach den MVP-Entscheidungen).

## 1. Was gebaut wird

AUAN (Ausstellungs-Angebote) ist ein internes Tool der Badausstellungen der Unternehmensgruppe Pietsch. Badverkäufer erstellen damit nach einer Ausstellungsberatung hochwertige Angebotsmappen (Exposés) für den Fachhandwerker (FHW), der sie an seinen Endkunden weitergibt. Ablauf: Projekt anlegen → Eckdaten, Termine, Teilnehmer, Notizen (tippen oder diktieren) → SAP-Angebotsexport (Excel/CSV) hochladen → KI extrahiert die exposéwerten Artikel und reichert sie über OXOMI an → Badverkäufer prüft im Review → Stilwahl (modern, edel, minimalistisch) → KI generiert die Mappe → kapitelweise Nachbearbeitung → druckfertiges PDF (A4 hoch) als Download. Kein Mailversand im MVP. Zielgröße später ca. 500 Mappen/Monat; der MVP validiert den Prozess mit der Ausstellung Ahaus.

## 2. Verbindliche Grundregeln (nicht verhandelbar)

1. **Keine Preise.** Preis- und Konditionsspalten aus dem SAP-Export werden beim Import erkannt und VERWORFEN, bevor irgendetwas gespeichert wird. Sie existieren nirgends im System, in keinem Log, in keiner Mappe.
2. **Bilder nur aus lizenzierten Quellen:** OXOMI/Herstellermedien oder eigene Uploads. Webrecherche liefert ausschließlich Fakten und Textinformationen, niemals Bilder. (OXOMI-Nutzung inkl. gedruckter Weitergabe an Endkunden ist vertraglich geklärt und erlaubt.)
3. **Fakten nur aus Daten.** Maße, Material, Farbe, Serie kommen aus OXOMI-Daten oder manueller Eingabe und werden als separate Faktenzeile gerendert. Die KI formuliert Texte, erfindet aber keine Produkteigenschaften. Keine Datengrundlage = keine Faktenangabe.
4. **Marken-Duo gleichberechtigt:** FHW und Ausstellung treten gemeinsam auf (beide Logos, beide Ansprechpartner). Endkunden-Ansprache in Sie-Form.
5. **Datensparsamkeit:** Vom Endkunden nur der Familienname. Diktat-Audio wird nach erfolgreicher Transkription gelöscht. Keine Secrets im Code, im Repo oder in Logs.

## 3. Festgelegter Stack

| Baustein | Festlegung |
|---|---|
| Repo | github.com/VleoS-87/AUAN |
| Framework | Next.js (App Router, TypeScript), eine Webanwendung für Desktop und Mobile (responsive; mobil reduziert auf Diktat und Nachschau) |
| Hosting | Vercel, bestehendes Projekt `auan-nfqo` |
| Datenbank | Neon Postgres über den Vercel-Marketplace, Free-Tier. Standard-PostgreSQL, keine Neon-exklusiven Features. Migrationen versioniert im Repo (z. B. Drizzle) |
| Dateien | Vercel Blob (Planungsbilder, Logos, erzeugte PDFs). Auslieferung nur über kurzlebige signierte URLs |
| KI Text | OpenAI API. Aufgabenschnitt: kleines Modell für Import-/Klassifikationsaufgaben, starkes Modell für Kapitel- und Artikeltexte. Modelle NICHT hart verdrahten, sondern je Aufgabe konfigurierbar (eigene Zwischenschicht, siehe Abschnitt 8) |
| Diktat | OpenAI Whisper-Transkription über denselben Key. Audio nach Erfolg löschen |
| PDF | HTML/CSS-Templates, serverseitig gerendert mit Headless Chromium. Auf Vercel: `puppeteer-core` + `@sparticuz/chromium` (Serverless-tauglich); lokal Playwright/Puppeteer normal |
| Auth | Eigene schlanke Lösung: Login mit Mail + Passwort (Argon2-Hash), Erstlogin erzwingt Passwortwechsel (Startpasswort Pietsch2026). Als austauschbare Schicht bauen (später Entra/SSO) |
| Mail | ENTFÄLLT im MVP. Nur PDF-Download |

## 4. Umgebungsvariablen und Arbeitsmodus

**Arbeitsmodus: Cloud.** Die Entwicklung läuft in Claude Code als Cloud-Session mit GitHub-Anbindung (Repo VleoS-87/AUAN), nicht auf einem lokalen Rechner. Konsequenzen: Gearbeitet wird über Commits und Pushes ins Repo; das Vercel-Projekt `auan-nfqo` ist mit dem Repo verbunden und deployt jeden Push automatisch. Alle Umgebungsvariablen sind bereits vollständig in Vercel hinterlegt (inkl. der von Neon und Blob automatisch angelegten Aliasse; genutzt werden nur die unten gelisteten Namen). Echte Aufrufe gegen OXOMI und OpenAI werden deshalb primär über die automatisch deployte Vercel-Umgebung getestet, wo die Schlüssel liegen. Stehen in der Claude-Cloud-Umgebung selbst Umgebungsvariablen zur Verfügung, dürfen sie genutzt werden; Secrets werden aber NIEMALS im Chat erfragt, in Dateien geschrieben oder ins Repo committet. Eine `.env.local` ist nur relevant, falls später doch lokal entwickelt wird (dann per `vercel env pull .env.local`, Datei steht in `.gitignore`).

Referenz der genutzten Variablen (Werte liegen in Vercel; Vorlage `.env.example`):

```
DATABASE_URL            # Neon Postgres Connection String
BLOB_READ_WRITE_TOKEN   # Vercel Blob
OPENAI_API_KEY          # Text + Whisper
OXOMI_PORTAL            # Portal-ID
OXOMI_USER              # technischer Benutzer
OXOMI_SECRET            # Shared Secret für Token-Erzeugung
APP_SECRET              # Session-Signierung
```

## 5. OXOMI-Anbindung (Kernbaustein, zuerst bauen)

- Authentifizierung nach dem in der Gruppe erprobten INT63-Token-Verfahren: `token = md5(secret + md5(secret + portal + user + expires + roles))`, Rolle `shop`, Token täglich bzw. mit Ablaufzeit erneuern. Bei Abweichung gegen die aktuelle OXOMI-Doku kalibrieren (ein Kalibrier-Fallback hat sich bewährt).
- Aufgabe des Bausteins: Eingabe Hersteller + Werksnummer (bevorzugt) oder Pietsch-Artikelnummer → Ausgabe Produktbilder (höchste Auflösung), Langtexte, Attribute, eCl@ss-Klassifikation, ggf. Prospektseiten.
- **Artikel-Cache ist Pflicht:** Jedes Anreicherungsergebnis wird dauerhaft in der DB gespeichert (Tabelle `artikel_cache`) und bei jeder weiteren Anfrage wiederverwendet. OXOMI wird nur für unbekannte Artikel oder beim Aktualisierungslauf gerufen. Auch manuell gepflegte Inhalte landen im Cache.
- Drosselung und Wiederholungslogik einbauen; ein langsames OXOMI verzögert einen Auftrag, bricht ihn nie ab.
- Den Baustein als eigenständiges Modul mit klarer Schnittstelle schneiden (wird später von einem zweiten Projekt mitgenutzt).

## 6. Datenmodell (Kern)

Eine Ausstellung hat Berater. Ein Projekt gehört zu genau einem Endkunden (nur Familienname, statischer Anker) und einer Ausstellung, trägt eine wechselbare FHW-Zuordnung und hat 0..n Mappen. Eine Mappe basiert auf genau einem Angebotsimport und friert bei Generierung den FHW-/Berater-Stand ein.

| Entität | Kernfelder |
|---|---|
| ausstellung | name, ort |
| berater | name, mail (login), passwort_hash, ausstellung_id, position, telefon, foto optional |
| fhw | firma, ort, ansprechpartner, kontakt, logo (Blob), eckdaten (für KI-Profiltext), profiltext |
| projekt | endkunde_familienname, projektname, berater_id, ausstellung_id, fhw_id (wechselbar), status, loeschfrist (Standard 24 Monate, konfigurierbar) |
| termin | projekt_id, datum, notiz |
| teilnehmer | projekt_id, name, rolle, seite (endkunde/fhw/ausstellung) |
| notiz | projekt_id, text, quelle (getippt/diktat), zeitstempel |
| bild | projekt_id, blob_ref, zuordnung (bereich ODER typ: gesamtansicht, draufsicht, masszeichnung, titelbild) |
| mappe | projekt_id, import_id, stil, status (entwurf/in_pruefung/final), fhw_snapshot, berater_snapshot |
| import | mappe_id, dateiname, positionsliste (OHNE Preise) |
| position | import_id, pietsch_nr, bezeichnung, menge, hersteller, werksnummer, oxomi_status, kapitel, exposewert (bool), manuelle_inhalte |
| artikel_cache | schlüssel (hersteller+werksnummer bzw. pietsch_nr), bilder, fakten, eclass, quelle, stand |
| kapitel_inhalt | mappe_id, kapitel, generierter_text, manuell_editiert (bool), version |

Sichtbarkeit: Berater sehen alle Projekte ihrer Ausstellung (Vertretungsfall), nie andere Ausstellungen. Jede Query ist entsprechend gescoped; IDs sind Zufallswerte, keine laufenden Nummern.

## 7. Fachlogik

**Import (Excel/CSV aus SAP IEQ01/02):** Echte Beispieldateien folgen (siehe `testdaten/sap/README_NACHLIEFERUNG.md`). Bis dahin gegen dieses angenommene Schema bauen und einen Spalten-Zuordnungsassistenten vorsehen, der beim ersten Upload einer unbekannten Variante die Spalten zuordnen lässt: Pietsch-Artikelnummer, Bezeichnung, Menge, optional Hersteller, optional Werksnummer, Preisspalten (erkennen und verwerfen).

**Matching-Kaskade je Position:** 1) Hersteller + Werksnummer direkt gegen OXOMI. 2) Nur Pietsch-Nummer: gegen `artikel_cache` (dort sammeln sich Zuordnungen), sonst Stufe 3. 3) Manuelle Nacherfassung von Hersteller + Werksnummer im Review, dann erneut matchen. 4) Individualartikel (nicht in SAP angelegt, nur Serie und Hersteller bekannt): Badverkäufer wählt den übergeordneten Serienartikel als Darstellungsgrundlage. 5) Kein Treffer: manueller Artikel mit eigenem Bild und Text.

**Exposé-Auswahl:** Sichtbare, gestalterisch relevante Artikel rein (Waschtische, Möbel, WCs, Armaturen, Wannen, Duschabtrennungen, Design-Accessoires, Heizkörper mit Gestaltungswert). Funktionsware raus (Eckventile, Siphons, Befestigung, Dichtstoffe), außer erkennbare Designobjekte. Unterputztechnik (Spülkästen, UP-Körper, Installationselemente) nicht einzeln zeigen, sondern zu einem Kapitel „Unterputztechnik" zusammenfassen.

**Kapitel:** Waschtischanlage, WC-Anlage, Urinal, Wannenanlage, Duschanlage, Unterputztechnik, Ausstattungsgegenstände, Wärmequellen. Nur vorhandene Kapitel erscheinen. Zuordnung: eCl@ss aus OXOMI als strukturierte Grundlage plus KI-Vorschlag aus Bezeichnung/Herstellerdaten; im Review per Klick korrigierbar.

**Review (vor Generierung):** Zweigeteilte Artikelansicht (gewählt / nicht gewählt) mit Klick-Übernahme in beide Richtungen, OXOMI-Status je Artikel, Nacherfassung am Artikel, Kapitel per Auswahl änderbar, Bulletpoints der Projektangaben (Termine, Teilnehmer, Notizen-Extrakt) editierbar.

**Mappe (PDF A4 hoch):** Titelseite (Titelbild-Upload bevorzugt, sonst Gesamtansicht; Projektname, Familienname, beide Logos, Datum) → Einleitung (emotional, stilkonform, Bezug auf Ausstellungsbesuch und Termine; Gesamtansicht/Draufsicht eingebunden) → Kapitel je vorhandenem Bereich (fachliche exposéreife Einleitung, dann je Artikel: Bild, redaktioneller Text, Faktenzeile; zugeordnete Bereichsbilder im Kapitel; je Bereich 1–2 Seiten, hart max. 3; Artikel nie über Seitengrenzen zerreißen) → Maßzeichnungen gesammelt auf eigener Seite hinten → Kontaktseite (FHW-Profil + Berater-Profil, wer ist wofür Ansprechpartner) → Rückseite (beide Logos im Footer, mittig ein Spruch aus der kuratierten Bibliothek je Stil, keine freie Generierung).

**Nach der Generierung:** Kapitel einzeln editierbar und einzeln neu generierbar (gleicher Jobtyp im Kleinen). Erst dann Finalisierung und PDF-Download.

**Angebotsänderung (V2):** Neuer Import an derselben Mappe zeigt Diff (neu/entfallen); manuelle Bearbeitungen unveränderter Artikel und editierte Kapitel bleiben erhalten.

## 8. KI-Zwischenschicht

Alle KI-Aufrufe laufen über ein eigenes Modul (`lib/ki/`): je Aufgabe Anbieter, Modell und Prompt konfigurierbar und versioniert (Prompts als Dateien in `prompts/`, nicht im Code verstreut). Jeder Aufruf loggt Aufgabe, Modell, Tokenumfang und Kosten je Mappe. Budgetdeckel je Mappe und je Monat als Konfiguration, bei Überschreitung Stopp mit sauberer Fehlermeldung. Stiltonalität: modern = frisch, direkt, kurze aktive Sätze; edel = ruhig, gehoben, Material und Beständigkeit betonend, fließende Sätze; minimalistisch = knapp, präzise, kein Schmuck. Stil steuert Layout UND Tonalität gemeinsam.

## 9. Design und Templates

Grundstil badpunkt: cleanes Schwarz-Weiß-Fundament, serifenlose moderne freie Schrift (lizenzfrei wählen, z. B. Google Fonts, wird mit neuem CI ohnehin getauscht), Akzent Grün, Understatement. Logos liegen in `testdaten/logos/` (badpunkt aktuell, badambiente für den späteren Markenwechsel). Farben, Logos und Schriften als zentrale Design-Tokens über allen drei Stil-Templates, damit der CI-Wechsel ein Token-Tausch ist. Templates HTML/CSS mit Print-Styles; Vorschau im Editor und finales PDF aus derselben Quelle.

## 10. Hintergrundverarbeitung

Jede Aktion über ca. 2 Sekunden (Import-Analyse, Anreicherung, Generierung, PDF) läuft als Hintergrundauftrag mit Statusanzeige am Projekt (Warteschlange in Postgres reicht im MVP: Tabelle `job` mit Status, Versuchen, Fehlertext; Verarbeitung über Vercel Functions/Cron oder getriggerte Route). Aufträge sind idempotent und wiederholbar; Teilergebnisse gehen nie verloren. Parallelität mit Deckel je Dienst (OXOMI, OpenAI).

## 11. Sicherheit und Datenschutz (MVP-Pflichtumfang)

- Argon2-Passworthashes, Sperrlogik nach Fehlversuchen, Session über signierte HttpOnly-Cookies (APP_SECRET).
- Autorisierung bei jeder Anfrage im Anwendungskern; Ausstellungs-Scoping in jeder Query.
- robots.txt + noindex; keine öffentliche Registrierung, Beraterkonten werden angelegt (Admin-Funktion), Selbstpflege des Profils.
- Blob-Zugriff nur über kurzlebige signierte URLs.
- Preisverwerfen beim Import und Audio-Löschung nach Transkription mit Tests absichern (das sind die zwei heikelsten Codepfade).
- Protokoll sicherheitsrelevanter Aktionen: Login, Passwortänderung, Finalisierung/Download, Löschung.
- Löschfrist je Projekt (Standard 24 Monate, konfigurierbar), täglicher Löschlauf inkl. Blobs, Löschung wird protokolliert.
- Testdaten sind durchgehend erfunden; echte Endkundennamen nur in Produktion.

## 12. Testdaten in diesem Paket

| Ordner | Inhalt |
|---|---|
| `testdaten/artikel/` | Artikel-Testliste (CSV strukturiert + Original-DOCX): 5 reale Artikel inkl. Eigenmarken mit Pietsch-Nr., Werksnummer, EAN, Hersteller. DAS Testset für den OXOMI-Baustein. Wird noch erweitert (Dusche, Wanne, Armatur, Heizkörper, Individualartikel) |
| `testdaten/planung/` | Echte 3D-Planungsbilder: Gesamtansicht (Skizze), fotorealistisches Render, Draufsicht |
| `testdaten/logos/` | badpunkt (aktuell) und badambiente (späterer Wechsel) |
| `testdaten/fhw/` | Muster-FHW Oxenfart GmbH (Recherchestand, vor Echtnutzung verifizieren) |
| `testdaten/diktate/` | 2 synthetische Beispiel-Diktate (PLATZHALTER, werden im Praxistest ersetzt) |
| `testdaten/sap/` | Noch leer. Hier kommen echte SAP-Angebotsexporte (Excel/CSV, Preisspalten absichtlich enthalten) und Status-quo-Mappen als Referenz hinein, sobald geliefert. T-A und T-B brauchen keine SAP-Daten; vor Abschluss von T-C müssen sie vorliegen |

Test-Setup: Ausstellung "Ahaus", Berater "Volker" als Erstnutzer; Anlage weiterer Berater mit eigener Profilpflege muss funktionieren.

## 13. Fahrplan mit Abnahmekriterien

| Stufe | Paket | Abnahme |
|---|---|---|
| T-A | OXOMI-Baustein + Artikel-Cache + einfach geschützte Testroute im Deployment (z. B. `/dev/oxomi-test`, Zugriff nur mit Schlüsselparameter, der gegen APP_SECRET geprüft wird) | Alle 5 Testartikel laufen über die deployte Testroute durch; je Artikel: Trefferstatus, Bilder, Fakten, eCl@ss sichtbar; Trefferquote und Lücken dokumentiert |
| T-B | Grundgerüst: Auth, Datenmodell, Projekt-/FHW-/Berater-Verwaltung | Login mit Erstpasswortwechsel, Projekt anlegbar, FHW mit Logo anlegbar, KI-Profiltext aus Oxenfart-Eckdaten generierbar |
| T-C | Import + Matching-Kaskade + Review | Beispiel-CSV läuft bis zum geprüften Warenkorb; Preisspalten nachweislich verworfen (Test); Spalten-Assistent funktioniert. Echte SAP-Exporte vor Abschluss einspielen |
| T-D | Stil-Templates, Generator, Kapitel-Editor, PDF | Eine komplette Mappe je Stil aus dem Musterprojekt (Planungsbilder + Testartikel + Diktat-Platzhalter), Layoutregeln eingehalten, PDF druckfähig |
| T-E | Diktat (auch mobil), Bild-Zuordnung, Finalisierung, Löschlauf, Protokoll | Diktat am Handy → editierbarer Text, Audio gelöscht; Mappe finalisierbar und herunterladbar |
| T-F | Härtung: Tests der heiklen Pfade, Lasttest klein, Wiederherstellungsprobe | Abnahmeprotokoll; danach Praxistest in Ahaus |

## 14. Arbeitsweise

- Grundsatz der Gruppe: KI entwirft, Mensch gibt frei. Kleine, nachvollziehbare Commits; nach jeder Stufe kurzer Statusbericht (was fertig, was offen, was gemessen).
- Bei Zielkonflikten gilt die Reihenfolge: Grundregeln (Abschnitt 2) > dieses Dokument > Konzepte in `docs/` > eigene Annahme (dann als Annahme kennzeichnen und melden).
- Nichts erfinden: Fehlende Fakten (z. B. SAP-Spalten) als offen markieren und mit Annahme weiterbauen, nicht plausibel raten und verschweigen.
