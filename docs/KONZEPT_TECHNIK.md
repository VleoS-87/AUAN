![](media/fd675bba0b33c64d90b2fd46c8235b2a1100e287.png){width="2.2916666666666665in"
height="0.6458333333333334in"}

**Angebotsmappen-Tool: Technikkonzept**

Architektur, Hosting, Sicherheit und Betrieb für die Umsetzung des
Fachkonzepts V1

  ----------------- -----------------------------------------------------
  Dokument          V1_Angebotsmappen_Technikkonzept

  Version           V1, Entwurf zur Abstimmung

  Datum             25.08.2026

  Verantwortlich    Volker, Bereichsleitung Digitaler Vertrieb

  Grundlage         V1_Angebotsmappen_Konzept (Fachkonzept)

  Vertraulichkeit   Intern, Unternehmensgruppe Pietsch
  ----------------- -----------------------------------------------------

**1. Zusammenfassung**

Dieses Technikkonzept beantwortet drei Fragen zum Angebotsmappen-Tool:
Wie bauen wir es, wie hosten wir es sicher, und wie stellen wir sicher,
dass es mit 500 Mappen pro Monat und darüber hinaus zuverlässig läuft.

Die Architektur folgt vier Leitprinzipien. Erstens: Alles, was dauert,
läuft im Hintergrund; der Badverkäufer wartet nie vor einem drehenden
Rad, sondern sieht einen Status. Zweitens: Ein zentraler Artikel-Cache
speichert einmal angereicherte Artikel dauerhaft, dadurch sinken
KI-Kosten und Wartezeiten mit jeder Mappe, und die Datenqualität wächst
mit der Nutzung. Drittens: Austauschbarkeit an den teuren Stellen;
KI-Anbieter, Stil-Templates und Hosting-Plattform sind über saubere
Zwischenschichten getauscht, ohne das Tool umzubauen. Viertens:
Sicherheit und Datenschutz sind Konstruktionsmerkmale, keine
Nachrüstung; Preisdaten werden schon beim Import verworfen,
Audioaufnahmen nach der Umwandlung gelöscht, alle Dienste laufen mit
EU-Datenverarbeitung und Auftragsverarbeitungsverträgen.

Für Hosting und Betrieb empfehle ich für Stufe 1 den in der Gruppe
bereits erprobten Weg: Webanwendung auf einer verwalteten
EU-Cloud-Plattform mit PostgreSQL-Datenbank in Frankfurt, nach demselben
Muster wie die Stammdaten-Plattform SDP. Das ist in Wochen statt Monaten
startklar, DSGVO-sauber umsetzbar und bewusst so gebaut, dass ein
späterer Umzug in die Konzern-IT ein Umzug bleibt und kein Neubau wird.
Die Entscheidung über den dauerhaften Betriebsort fällt als Gate vor dem
Rollout gemeinsam mit IT und Datenschutz.

**2. Technische Anforderungen aus dem Fachkonzept**

**2.1 Funktional (was das System können muss)**

-   Excel/CSV-Import des SAP-Angebots mit Validierung, Spaltenerkennung
    und Verwerfen der Preisspalten vor jeder Speicherung.

-   Matching-Kaskade je Position (Werksnummer/Hersteller,
    Pietsch-Nummer, manuelle Nacherfassung, Serienartikel, manueller
    Artikel) mit OXOMI-Anbindung.

-   KI-Klassifikation (exposéwert ja/nein, Kapitelzuordnung über eCl@ss
    plus KI-Vorschlag) und KI-Textgenerierung je Stil mit strikter
    Trennung von Fakten und Formulierung.

-   Diktatfunktion: Audioaufnahme im Browser, Umwandlung in editierbaren
    Text, Löschung der Aufnahme nach der Umwandlung; nutzbar am PC,
    Tablet und Handy.

-   Bild-Uploads (JPG) mit Zuordnung, Logo-Verwaltung je Fachhandwerker,
    Beraterprofile.

-   Kapitelweiser Editor mit Einzel-Neugenerierung, danach PDF-Erzeugung
    in A4 hoch in reproduzierbarer Druckqualität.

-   Mailversand der fertigen Mappe an den Fachhandwerker mit kurzem
    Anschreiben.

**2.2 Nicht funktional (wie es laufen muss)**

  -----------------------------------------------------------------------
  **Anforderung**      **Zielwert für Stufe 1**
  -------------------- --------------------------------------------------
  Mengengerüst         Rund 500 Mappen pro Monat, das sind etwa 25 pro
                       Arbeitstag über alle Ausstellungen, mit Spitzen am
                       Vormittag. Ausgelegt wird auf das Dreifache, damit
                       Wachstum und Lastspitzen ohne Umbau abgedeckt
                       sind.

  Antwortzeiten        Bedienoberfläche reagiert unmittelbar. Die
                       Mappen-Generierung läuft als Hintergrundauftrag
                       mit Statusanzeige; Zielkorridor wenige Minuten je
                       Mappe, gemessen und nachgewiesen im Pilot.

  Verfügbarkeit        Werktags zu Ausstellungszeiten zuverlässig
                       nutzbar. Kein 24/7-Anspruch, aber saubere
                       Wartungsfenster außerhalb der Öffnungszeiten.

  Sicherheit           Zugriff nur für angemeldete Badverkäufer,
                       verschlüsselte Übertragung und Speicherung,
                       tägliche Sicherungen, Protokollierung
                       sicherheitsrelevanter Aktionen. Details in Kapitel
                       7.

  Datenschutz          EU-Datenverarbeitung für alle Dienste,
                       Auftragsverarbeitungsverträge, technisches
                       Löschkonzept. Details in Kapitel 8.

  Wartbarkeit          CI-Wechsel (badpunkt zu Bad Ambiente) als reiner
                       Template-Tausch; KI-Anbieterwechsel ohne Umbau;
                       Kern-Baustein OXOMI-Anreicherung wiederverwendbar
                       für andere Projekte.
  -----------------------------------------------------------------------

**3. Architektur im Überblick**

Das Tool ist eine Webanwendung aus klar getrennten Bausteinen. Jeder
Baustein hat eine Aufgabe und eine definierte Schnittstelle; das ist die
Grundlage dafür, dass das System skaliert, testbar bleibt und einzelne
Teile (KI-Anbieter, Hosting, Design) austauschbar sind.

  -------------------------------------------------------------------------
  **Baustein**            **Aufgabe in Alltagssprache**
  ----------------------- -------------------------------------------------
  Web-Oberfläche          Das, was der Badverkäufer sieht: Projektliste,
                          Review, Editor. Läuft im Browser, am PC in voller
                          Breite, am Tablet und Handy in der reduzierten
                          Ansicht für Diktat und Nachschau. Eine Anwendung
                          für alle Geräte, keine separate App.

  Anwendungskern (API)    Die Logik dahinter: Wer darf was, welche Daten
                          gehören zu welchem Projekt, was passiert beim
                          Import. Jede Aktion der Oberfläche läuft über
                          diesen Kern, nie direkt auf die Datenbank.

  Datenbank (PostgreSQL)  Das Gedächtnis: Projekte, Mappen, Artikel,
                          Fachhandwerker, Profile, entsprechend dem
                          Datenmodell aus Kapitel 11 des Fachkonzepts.
                          PostgreSQL ist bewusst gewählt, weil es ein
                          offener Standard ist, den jede spätere
                          Betriebsumgebung beherrscht.

  Dateispeicher           Ablage für Binärdaten: hochgeladene JPGs, Logos,
                          erzeugte PDFs. Zugriff nur über kurzlebige,
                          signierte Links, nie über öffentliche Adressen.

  Auftrags-Verarbeitung   Die Fließband-Halle: Import, Matching,
  (Jobs)                  Anreicherung, Textgenerierung und PDF-Erzeugung
                          laufen als Hintergrundaufträge mit Warteschlange,
                          Wiederholungslogik und Statusanzeige. Kapitel 4
                          erklärt, warum das zentral ist.

  Artikel-Anreicherung    Der wiederverwendbare Kern: nimmt Hersteller plus
  (OXOMI-Baustein)        Werksnummer (oder die Pietsch-Nummer) entgegen
                          und liefert Bilder, Texte, Attribute und eCl@ss
                          aus OXOMI. Mit eigenem Artikel-Cache (Kapitel 5).
                          Wird so geschnitten, dass die Kojen-Plattform ihn
                          später mitnutzen kann.

  KI-Textdienst           Anbindung der Sprachmodelle über eine eigene
                          Zwischenschicht: Aufgaben, Prompts und Modelle
                          sind dort zentral definiert und versioniert.
                          Details in Kapitel 9.

  Sprache-zu-Text         Wandelt Diktate in Text um. Getrennter Dienst mit
                          EU-Verarbeitung; die Audiodatei wird nach
                          erfolgreicher Umwandlung gelöscht.

  PDF-Renderer            Baut aus den generierten Inhalten und dem
                          gewählten Stil-Template das druckfertige PDF.
                          Technisch: HTML/CSS-Templates, gerendert über
                          einen Browser-Kern im Server, dadurch pixelgenaue
                          Kontrolle über das Layout. Details in Kapitel 10.

  Mailversand             Transaktionaler Maildienst für den Versand der
                          Mappe an den Fachhandwerker und Systemmails (z.
                          B. Passwort zurücksetzen), mit eigener
                          Absenderdomain und Zustellungsnachweis.

  Anmeldung und Rechte    Login mit Mailadresse und Passwort in Stufe 1,
                          als eigene Schicht gebaut, damit die spätere
                          Anbindung an M365/Entra ein Austausch dieser
                          Schicht ist und kein Eingriff ins Tool.
  -------------------------------------------------------------------------

**4. Grundsatz: Langläufer laufen im Hintergrund**

Eine Mappe zu generieren heißt: Dutzende Artikel anreichern, mehrere
Kapiteltexte erzeugen, Bilder aufbereiten, ein PDF rendern. Das dauert
Minuten, nicht Sekunden. Würde das im Vordergrund laufen, hinge der
Badverkäufer an einem Ladebalken, und jeder Verbindungsabbruch würde den
Vorgang zerstören.

Deshalb gilt als Konstruktionsprinzip: Jede Aktion, die länger als etwa
zwei Sekunden dauert, wird ein Hintergrundauftrag. Der Badverkäufer
stößt die Generierung an, kann das Fenster schließen, weiterarbeiten
oder zum nächsten Kunden gehen, und sieht am Projekt den Fortschritt
(angereichert, Texte erstellt, PDF fertig). Technisch bedeutet das eine
Warteschlange mit folgenden Eigenschaften:

-   Wiederholbarkeit: Schlägt ein Teilschritt fehl (etwa weil OXOMI kurz
    nicht antwortet), wird er automatisch erneut versucht, ohne dass
    fertige Teile verloren gehen.

-   Nachvollziehbarkeit: Jeder Auftrag protokolliert, was er getan hat.
    Bei einer Störung ist sichtbar, an welchem Artikel oder Kapitel es
    hängt.

-   Parallelität mit Deckel: Mehrere Mappen laufen gleichzeitig, aber
    mit definierten Obergrenzen je Dienst, damit Lastspitzen nicht zu
    Kostenspitzen oder Drosselungen bei OXOMI und den KI-Anbietern
    führen.

-   Kapitel als Einzelaufträge: Die Einzel-Neugenerierung eines Kapitels
    aus dem Editor ist derselbe Auftragstyp im Kleinen, keine
    Sonderlocke.

**5. Der Artikel-Cache als Herzstück der Skalierung**

Die teuerste und langsamste Operation im System ist die Anreicherung
eines Artikels: OXOMI-Abfragen, gegebenenfalls Webrecherche,
KI-Aufbereitung. Gleichzeitig wiederholen sich Artikel massiv, denn die
Ausstellungen verkaufen aus einem gemeinsamen Sortiment, und Renner
tauchen in vielen Mappen auf.

Deshalb bekommt das System eine zentrale Artikel-Bibliothek: Ist ein
Artikel einmal angereichert (Bilder, Faktendaten, eCl@ss,
Herstellerinfos), wird dieses Ergebnis dauerhaft gespeichert und bei
jeder weiteren Mappe wiederverwendet. Nur der redaktionelle Text wird je
Mappe neu generiert, damit die Personalisierung erhalten bleibt; die
Faktenbasis und die Bilder kommen aus dem Cache. Auch manuell gepflegte
Inhalte (Individualartikel, OXOMI-Lücken) landen in der Bibliothek und
stehen ab dann allen Badverkäufern zur Verfügung.

Die Wirkung ist doppelt: Die Kosten und die Dauer je Mappe sinken mit
jeder Woche Nutzung, weil der Anteil bereits bekannter Artikel steigt.
Und die Qualität steigt, weil einmal korrigierte Daten nie wieder falsch
aus einer Quelle gezogen werden. Ein Aktualisierungslauf prüft
Cache-Einträge in definierten Abständen gegen OXOMI, damit veraltete
Inhalte nicht ewig leben. Perspektivisch ist diese Bibliothek derselbe
Baustein, den die Kojen-Plattform nutzt; sie wird deshalb mit eigener
Schnittstelle und ohne Abhängigkeiten zum Rest des Mappen-Tools gebaut.

**6. Hosting und Betriebsmodell**

Für den Betriebsort gibt es zwei realistische Wege. Beide sind
DSGVO-konform umsetzbar, sie unterscheiden sich in Geschwindigkeit,
Aufwand und organisatorischer Einbettung.

  --------------------------------------------------------------------------------
  **Kriterium**     **Weg A: Verwaltete             **Weg B: Konzern-IT**
                    EU-Cloud-Plattform**            
  ----------------- ------------------------------- ------------------------------
  Beschreibung      Webanwendung auf einer          Betrieb in der von der IT
                    verwalteten Plattform,          verantworteten Umgebung (z. B.
                    PostgreSQL und Dateispeicher    Azure-Umfeld der Gruppe),
                    als verwalteter Dienst in       eingebettet in bestehende
                    Frankfurt. Muster wie die       Betriebsprozesse.
                    Stammdaten-Plattform SDP, dort  
                    bereits erprobt.                

  Zeit bis Pilot    Wochen. Kein Beschaffungs- und  Abhängig von Kapazität und
                    Einrichtungsprojekt nötig.      Priorisierung der IT,
                                                    realistisch Monate.

  Betriebsaufwand   Gering: Updates, Skalierung,    Läuft in etablierten
                    Sicherungen übernimmt die       IT-Prozessen mit klaren
                    Plattform. Verantwortung für    Zuständigkeiten, bindet aber
                    Konfiguration bleibt beim       IT-Kapazität.
                    Projekt.                        

  Sicherheit        Professionelles                 Konzern-Sicherheitsstandards
                    Plattform-Niveau                und zentrale Überwachung
                    (Zertifizierungen,              inklusive.
                    Verschlüsselung, Isolation);    
                    Härtung auf Anwendungsebene     
                    liegt beim Projekt (Kapitel 7). 

  Datenschutz       EU-Region,                      Identische Anforderungen,
                    Auftragsverarbeitungsverträge   Prüfung entsprechend.
                    mit allen Diensten, Prüfung     
                    durch den                       
                    Datenschutzbeauftragten vor dem 
                    Pilot.                          

  SSO (M365/Entra)  Später anbindbar, die           Naheliegend und früh
                    Anmeldeschicht ist dafür        verfügbar.
                    vorbereitet.                    

  Exit/Umzug        Konstruktiv eingeplant:         Entfällt, ist bereits das
                    Standard-PostgreSQL,            Zielbild.
                    containerfähige Dienste, keine  
                    plattformexklusiven Funktionen  
                    im Kern.                        
  --------------------------------------------------------------------------------

Empfehlung: Stufe 1 und der Pilot laufen auf Weg A, nach dem in der
Gruppe erprobten Muster. Begründung: Das Vorhaben lebt von schnellen
Lernschleifen mit echten Mappen, und Weg A liefert die Testumgebung in
Wochen. Damit daraus keine Sackgasse wird, gelten drei harte
Bauvorgaben: Standard-PostgreSQL ohne exklusive Plattformfunktionen,
alle Hintergrunddienste containerfähig, Anmeldung als austauschbare
Schicht. Die Entscheidung über den dauerhaften Betriebsort fällt am
Rollout-Gate (M5 des Fachkonzepts) gemeinsam mit IT und Datenschutz; ein
Umzug ist dann Datenexport plus Neudeployment, kein Neubau.

Wichtig für die Abstimmung: Die Konzern-IT wird nicht vor vollendete
Tatsachen gestellt, sondern ist ab der technischen Klärungsphase (M2)
eingebunden, damit Anforderungen an einen späteren Betrieb in der IT von
Anfang an in die Bauvorgaben einfließen.

**7. Sicherheitskonzept**

Das Tool verarbeitet Kundennamen, Beratungsnotizen und die
Geschäftsbeziehung zu Fachhandwerkern. Es ist nicht öffentlich, aber im
Internet erreichbar; das Sicherheitskonzept behandelt es deshalb wie
eine extern erreichbare Geschäftsanwendung.

**7.1 Zugriff und Rechte**

-   Anmeldung mit Mailadresse und Passwort; Passwörter werden
    ausschließlich als moderne Hashes gespeichert (Argon2), nie im
    Klartext. Erstlogin erzwingt den Wechsel des Startpassworts,
    Mindestlänge und Sperrlogik nach Fehlversuchen inklusive.

-   Sichtbarkeit: Ein Badverkäufer sieht die Projekte seiner
    Ausstellung, nicht nur die eigenen. Begründung: Vertretung bei
    Urlaub und Krankheit ist im Ausstellungsalltag der Normalfall. Über
    Ausstellungsgrenzen hinweg sieht niemand etwas; eine Admin-Rolle
    sieht alles.

-   Jede Anfrage wird im Anwendungskern autorisiert, zusätzlich
    abgesichert durch Zugriffsregeln direkt auf der Datenbank (Row Level
    Security). Selbst ein Fehler in der Anwendung gibt dadurch keine
    fremden Daten preis.

-   Kein Suchmaschinenzugriff (robots.txt und noindex), keine erratbaren
    Adressen (IDs sind Zufallswerte, keine laufenden Nummern).

**7.2 Daten und Verbindungen**

-   Alle Verbindungen ausschließlich verschlüsselt (TLS). Daten und
    Dateien liegen verschlüsselt auf den Speichersystemen.

-   Uploads und PDFs sind nur über kurzlebige, signierte Links
    erreichbar; ein weitergeleiteter Link läuft ab.

-   Zugangsdaten zu Diensten (OXOMI-Token, KI-Schlüssel, Mailversand)
    liegen ausschließlich serverseitig in einer Secrets-Verwaltung, nie
    im Browser oder im Code.

-   Tägliche automatische Sicherungen der Datenbank mit
    Punkt-in-Zeit-Wiederherstellung; Wiederherstellung wird vor dem
    Pilot einmal real geprobt, nicht nur behauptet.

**7.3 Nachvollziehbarkeit**

-   Sicherheitsrelevante Aktionen werden protokolliert: Anmeldungen,
    Passwortänderungen, Mappenversand, Löschungen, Adminaktionen. Das
    Protokoll beantwortet die Frage, wer wann welche Mappe an wen
    geschickt hat.

-   Getrennte Umgebungen für Entwicklung und Produktion; Entwicklung und
    Tests laufen mit erfundenen Daten, nie mit echten Endkundennamen.

**8. Datenschutz technisch umgesetzt**

  -----------------------------------------------------------------------
  **Baustein**           **Umsetzung**
  ---------------------- ------------------------------------------------
  EU-Verarbeitung        Alle Dienste (Hosting, Datenbank, Dateispeicher,
                         KI, Sprache-zu-Text, Mailversand) mit
                         Verarbeitung in der EU und
                         Auftragsverarbeitungsvertrag. Die AVV-Liste ist
                         Teil der Abnahme mit dem Datenschutzbeauftragten
                         vor dem Pilot.

  Datenminimierung im    Preis- und Konditionsspalten werden beim Import
  Code                   technisch verworfen, bevor gespeichert wird. Vom
                         Endkunden wird nur der Familienname geführt.
                         Diktat-Audiodateien werden nach erfolgreicher
                         Umwandlung automatisch gelöscht, gespeichert
                         bleibt nur der editierbare Text.

  Kein KI-Training       Vertragliche und technische Einstellung bei
                         allen KI-Diensten: Projektdaten werden nicht zum
                         Training fremder Modelle verwendet.

  Löschkonzept           Jedes Projekt trägt eine Aufbewahrungsfrist
                         (Festlegung mit dem Datenschutzbeauftragten,
                         offener Punkt 6 des Fachkonzepts). Ein täglicher
                         Löschlauf entfernt abgelaufene Projekte samt
                         Dateien und protokolliert die Löschung.
                         Einzellöschung auf Zuruf ist jederzeit möglich.

  Auskunftsfähigkeit     Alle Daten zu einem Endkunden hängen am Projekt
                         und sind mit einem Zugriff auffindbar und
                         exportierbar; damit sind Auskunfts- und
                         Löschersuchen ohne Suchaktion beantwortbar.
  -----------------------------------------------------------------------

**9. KI-Dienste: Aufgabenschnitt, Anbieter, Kostensteuerung**

**9.1 Aufgabenschnitt**

Nicht jede KI-Aufgabe braucht das stärkste Modell. Der Zuschnitt spart
Kosten und Zeit, ohne Qualität zu opfern:

  ------------------------------------------------------------------------
  **Aufgabe**                **Anspruch**             **Modellklasse**
  -------------------------- ------------------------ --------------------
  Import-Unterstützung       Robustheit,              Kleines, schnelles
  (Spalten erkennen,         Geschwindigkeit          Modell
  Positionen säubern)                                 

  Exposé-Auswahl und         Fachlogik, Regeltreue    Mittleres Modell
  Kapitelzuordnung                                    plus feste Regeln
                                                      und eCl@ss-Grundlage

  Kapitel- und Artikeltexte, Sprachqualität,          Starkes Modell
  Einleitung                 Stiltreue,               
                             Personalisierung         

  Profiltext Fachhandwerker  Sprachqualität           Starkes Modell,
                                                      seltener Aufruf

  Diktat zu Text             Erkennungsqualität       Spezialisierter
                             Deutsch, Fachbegriffe    Sprachdienst
  ------------------------------------------------------------------------

**9.2 Anbieterwahl und Austauschbarkeit**

Alle KI-Aufrufe laufen über eine eigene Zwischenschicht des Tools. Dort
sind je Aufgabe der Anbieter, das Modell und der Prompt hinterlegt,
versioniert und zentral änderbar. Das hat drei Effekte: Ein
Anbieterwechsel oder Modellwechsel ist eine Konfigurationsänderung und
kein Umbau. Prompt-Änderungen sind nachvollziehbar und rückrollbar. Und
jede Änderung wird gegen ein festes Testset geprüft (dieselben drei
Musterprojekte, je Stil eines), bevor sie produktiv geht; so wird
Textqualität messbar statt gefühlt. Anbieterseitig kommen nur Dienste
mit EU-Datenverarbeitung, Auftragsverarbeitungsvertrag und vertraglich
zugesichertem Trainingsausschluss infrage; die konkrete Auswahl ist Teil
der technischen Klärung (M2) gemeinsam mit dem Datenschutzbeauftragten.

**9.3 Kostensteuerung**

-   Jeder KI-Aufruf wird mit Aufgabe, Modell, Umfang und Kosten je Mappe
    protokolliert. Damit liefert der Pilot belastbare Kosten je Mappe,
    die im Fachkonzept bewusst als Messwert statt Schätzwert geführt
    sind.

-   Budgetgrenzen je Mappe und je Monat mit Alarm bei Ausreißern; eine
    fehlerhafte Schleife kann so keine Kostenexplosion verursachen.

-   Der Artikel-Cache (Kapitel 5) ist der größte Kostenhebel:
    Wiederkehrende Artikel verursachen keine erneute Anreicherung.

**10. Stil-Templates und PDF-Erzeugung**

Die drei Stile (modern, edel, minimalistisch) sind als
HTML/CSS-Templates umgesetzt und werden serverseitig über einen
Browser-Kern in ein PDF gerendert. Dieser Weg ist bewusst gewählt: Er
erlaubt pixelgenaue Gestaltung auf Magazin-Niveau, die Vorschau im
Kapitel-Editor und das finale PDF entstehen aus derselben Quelle (was
man sieht, ist was gedruckt wird), und Layoutfehler wie verrutschte
Bilder sind reproduzierbar testbar.

-   Design-Tokens: Farben, Logos und Schriften liegen als zentrale Werte
    über allen Templates. Der CI-Wechsel von badpunkt zu Bad Ambiente
    ist damit ein Tausch dieser Werte plus Sichtprüfung, kein Umbau der
    Templates.

-   Schriften werden lizenzsicher eingebettet, damit das PDF auf jedem
    Gerät und in jeder Druckerei identisch aussieht.

-   Bilder werden in der höchsten verfügbaren Auflösung aus OXOMI
    übernommen und für den Druck aufbereitet; fehlt Druckqualität, wird
    das im Review am Artikel angezeigt statt still gedruckt.

-   Seitenumbruch-Regeln sichern die Vorgabe aus dem Fachkonzept ab: je
    Bereich ein bis zwei Seiten, nie mehr als drei; Artikel werden nicht
    über Seitengrenzen zerrissen.

**11. Skalierung und Mengenbetrachtung**

500 Mappen pro Monat sind für eine sauber gebaute Webanwendung keine
Last, die Herausforderung liegt in den Hintergrundaufträgen und im
Speicher. Die Auslegung im Einzelnen:

  -----------------------------------------------------------------------
  **Dimension**        **Auslegung**
  -------------------- --------------------------------------------------
  Gleichzeitige Nutzer Größenordnung 30 bis 60 Badverkäufer, davon eine
                       Handvoll gleichzeitig aktiv. Unkritisch; die
                       Oberfläche wird trotzdem auf Ausstellungs-Hardware
                       und Tablets real getestet.

  Generierungen        Etwa 25 Mappen pro Arbeitstag plus
                       Einzelkapitel-Neugenerierungen. Die Warteschlange
                       verarbeitet mehrere Mappen parallel mit Deckel je
                       Dienst; Auslegung auf das Dreifache des
                       Mengengerüsts.

  OXOMI-Aufrufe        Durch den Artikel-Cache fallen Aufrufe vor allem
                       für neue Artikel an; die Aufrufrate sinkt im
                       Betrieb. Abrufe laufen mit Drosselung und
                       Wiederholungslogik, damit auch ein langsames OXOMI
                       die Mappe nur verzögert und nie zerstört.

  Speicher             Je Mappe fallen Bilder und ein PDF an, realistisch
                       im zweistelligen Megabyte-Bereich (Annahme, im
                       Pilot zu messen). Bei 500 Mappen pro Monat wächst
                       der Speicher damit um grob 10 bis 25 GB monatlich;
                       Objektspeicher skaliert das problemlos, das
                       Löschkonzept begrenzt es dauerhaft.

  Wachstum             Mehr Ausstellungen oder mehr Mappen bedeuten mehr
                       parallele Hintergrundaufträge, das skaliert
                       horizontal (mehr Arbeiter an derselben
                       Warteschlange). Ein Lasttest mit dem Dreifachen
                       des Mengengerüsts ist Teil der Abnahme vor dem
                       Rollout.
  -----------------------------------------------------------------------

**12. Entwicklungsvorgehen**

-   Quellcode in einem Repository der Gruppe (GitHub) mit Versionierung;
    jede Änderung durchläuft eine Vorschau-Umgebung, bevor sie produktiv
    geht.

-   KI-gestützter Eigenbau nach dem in der Gruppe etablierten Grundsatz:
    KI entwirft, Mensch gibt frei. Sicherheitsrelevante Teile
    (Anmeldung, Rechte, Import-Verwerfen der Preise, Löschläufe) werden
    zusätzlich gezielt geprüft und mit automatischen Tests abgesichert.

-   Getrennte Umgebungen: Entwicklung, Vorschau, Produktion. Testdaten
    sind durchgehend erfunden; echte Endkundennamen existieren nur in
    der Produktion.

-   Der OXOMI-Baustein wird als erstes Modul gebaut und gegen 20 bis 30
    reale Artikel getestet (deckungsgleich mit M2 des Fachkonzepts);
    damit steht das größte fachliche Risiko am Anfang und nicht am Ende
    der Entwicklung.

-   Abnahmekriterien je Ausbaustufe sind vorab definiert (funktioniert
    der Import mit echten Exporten, hält die Kapitelzuordnung die
    Trefferquote, hält das PDF die Layoutregeln), damit Fortschritt
    messbar bleibt.

**13. Betrieb und Überwachung**

-   Überwachung mit Alarmen auf die Kenngrößen, die den Alltag tragen:
    Fehlerrate der Hintergrundaufträge, Dauer je Mappe,
    OXOMI-Erreichbarkeit, KI-Kosten je Tag, Speicherverbrauch,
    fehlgeschlagene Anmeldeversuche.

-   Fehler-Tracking in der Anwendung: Tritt bei einem Badverkäufer ein
    Fehler auf, liegt die technische Ursache vor, bevor er anruft.

-   Klarer Supportweg für die Ausstellungen: ein definierter
    Ansprechpartner im digitalen Vertrieb, Sammel-Feedbackkanal im
    Pilot.

-   Wartungsfenster außerhalb der Ausstellungszeiten; Updates sind durch
    die Vorschau-Umgebung risikoarm und jederzeit rückrollbar.

-   Betriebsverantwortung in Stufe 1 beim digitalen Vertrieb mit
    definierter Eskalation; die Betriebsübergabe an die IT ist Teil der
    Rollout-Entscheidung (Kapitel 6).

**14. Technische Risiken und Absicherung**

  -----------------------------------------------------------------------------
  **Risiko**               **Wirkung**               **Absicherung**
  ------------------------ ------------------------- --------------------------
  OXOMI nicht erreichbar   Anreicherung stockt,      Artikel-Cache bedient
  oder gedrosselt          Mappen verzögern sich     Bekanntes weiter; Aufträge
                                                     warten und wiederholen
                                                     automatisch; Statusanzeige
                                                     statt Fehlermeldung beim
                                                     Nutzer.

  KI-Anbieter ändert       Kosten oder Textqualität  Zwischenschicht mit
  Preise, Qualität oder    kippen                    Anbieter- und
  Bedingungen                                        Modellwechsel per
                                                     Konfiguration; festes
                                                     Testset macht
                                                     Qualitätsvergleiche
                                                     objektiv; Zweitanbieter
                                                     wird in M2 mitgeprüft.

  Plattform-Abhängigkeit   Umzug in die Konzern-IT   Bauvorgaben:
  (Weg A)                  wird teuer                Standard-PostgreSQL,
                                                     containerfähige Dienste,
                                                     keine exklusiven
                                                     Plattformfunktionen im
                                                     Kern; Umzugspfad ist
                                                     dokumentiert.

  SAP-Export-Varianten     Import scheitert an       Import mit
                           abweichenden Spalten je   Spaltenerkennung und
                           Ausstellung               Zuordnungsassistent beim
                                                     ersten Upload je Variante;
                                                     ein standardisierter
                                                     Export bleibt das Ziel
                                                     (offener Punkt 1 des
                                                     Fachkonzepts).

  Diktat auf Altgeräten    Frust im wichtigsten      Aufnahme lokal mit
  oder schlechtem Netz     Komfortmerkmal            Wiederholung beim
                                                     Hochladen; Fallback ist
                                                     immer Tippen; Gerätetest
                                                     in einer echten
                                                     Ausstellung vor dem Pilot.

  Kostenausreißer bei      Budgetüberschreitung      Harte Budgetgrenzen je
  KI-Aufrufen                                        Mappe und Monat mit Alarm
                                                     und Stopp; Protokollierung
                                                     je Aufruf.

  Druckqualität der Bilder Mappe wirkt am Ende doch  Auflösungsprüfung je Bild
                           billig                    mit Anzeige im Review;
                                                     Probedrucke der drei
                                                     Musterprojekte auf dem
                                                     realen Ausstellungsdrucker
                                                     als Abnahmekriterium.
  -----------------------------------------------------------------------------

**15. Offene technische Punkte**

  -----------------------------------------------------------------------------
  **Nr.**   **Punkt**                                 **Klärung mit**
  --------- ----------------------------------------- -------------------------
  T1        Einbindung der Konzern-IT ab M2:          IT
            Anforderungen an einen späteren Betrieb   
            in der IT, Netzwerk- und                  
            Sicherheitsvorgaben, Zeitpunkt der        
            SSO-Anbindung (M365/Entra)                

  T2        Auswahl der KI- und Sprachdienste mit     Digitaler Vertrieb /
            EU-Verarbeitung, AVV und                  Datenschutz
            Trainingsausschluss; Zweitanbieter je     
            Aufgabe                                   

  T3        OXOMI: Vertrags- und Nutzungsrahmen für   Digitaler Vertrieb /
            diesen Anwendungsfall prüfen,             OXOMI
            insbesondere die gedruckte Weitergabe von 
            Herstellerinhalten in Mappen an           
            Endkunden; technisches Aufrufkontingent   
            klären                                    

  T4        AVV- und TOM-Prüfung des gesamten         Datenschutzbeauftragter
            Dienstestapels vor dem Pilot; Festlegung  
            der Löschfristen                          

  T5        Domain, Mail-Absenderdomain und Postfach  IT / Marketing
            für den Mappenversand                     

  T6        Lizenzklärung der Template-Schriften für  Marketing
            die PDF-Einbettung                        

  T7        Referenzmessung der Infrastruktur- und    Digitaler Vertrieb
            KI-Kosten je Mappe im Pilot (Grundlage    
            der Wirtschaftlichkeitsrechnung im        
            Fachkonzept)                              
  -----------------------------------------------------------------------------

**16. Technischer Fahrplan**

Der Fahrplan folgt den Meilensteinen des Fachkonzepts und setzt das
größte Risiko an den Anfang: Erst wenn der OXOMI-Baustein mit echten
Artikeln überzeugt, wird in Oberfläche und Generator investiert.

  ----------------------------------------------------------------------------
  **Stufe**   **Technikpaket**                      **Ergebnis / Nachweis**
  ----------- ------------------------------------- --------------------------
  T-A         OXOMI-Baustein mit Artikel-Cache      Gemessene Trefferquote und
              bauen, Test mit 20 bis 30 realen      Datenqualität;
              Artikeln inkl. Eigenmarken            Entscheidung über
              (entspricht M2)                       Nachschärfung der
                                                    Matching-Kaskade.

  T-B         Grundgerüst: Anmeldung, Rechte,       Lauffähiges, abgesichertes
              Datenmodell, Projekt- und             Gerüst mit Testdaten.
              FHW-Verwaltung, Umgebungen und        
              Sicherungen                           

  T-C         Import, Matching-Kaskade,             Echte SAP-Exporte laufen
              Review-Oberfläche                     bis zum geprüften
                                                    Warenkorb durch.

  T-D         Stil-Templates, Generator,            Drei Beispielmappen
              Kapitel-Editor, PDF-Erzeugung; die    inklusive Probedruck;
              drei Musterprojekt-Mappen für die     Freigabe durch
              Design-Validierung (entspricht M3)    Badverkäufer und
                                                    ausgewählte
                                                    Fachhandwerker.

  T-E         Diktatfunktion, Mobilansicht,         Funktionsumfang Stufe 1
              Mailversand, Löschläufe,              komplett.
              Protokollierung                       

  T-F         Härtung: Lasttest (dreifaches         Abnahmeprotokoll;
              Mengengerüst),                        Pilotstart mit einer
              Wiederherstellungsprobe,              Ausstellung.
              Datenschutz-Abnahme, Gerätetest in    
              einer Ausstellung; danach Pilot       
              (entspricht M4)                       
  ----------------------------------------------------------------------------

**17. Anhang: Fragen und Antworten**

**Warum nicht von Anfang an in der Konzern-IT hosten?**

Weil das Vorhaben in der Pilotphase von Geschwindigkeit lebt und die
IT-Kapazität an anderer Stelle gebunden ist. Ich baue deshalb auf dem in
der Gruppe erprobten Weg mit EU-Datenverarbeitung und hole die IT ab der
technischen Klärung an den Tisch, damit ihre Anforderungen von Anfang an
in den Bauvorgaben stecken. Die Entscheidung über den Dauerbetrieb fällt
am Rollout-Gate; durch die Bauvorgaben ist ein Umzug dann ein Umzug und
kein Neubau.

**Ist eine Cloud-Plattform sicher genug für Kundendaten?**

Die Plattformen selbst arbeiten auf einem Sicherheitsniveau mit
Zertifizierungen und Verschlüsselung, das eine Einzelanwendung im
Eigenbetrieb kaum erreicht. Entscheidend ist die Anwendungsebene, und
die liegt bei uns: Rechteprüfung doppelt (Anwendung und Datenbank),
verschlüsselte Verbindungen, signierte Dateilinks, Protokollierung,
geprobte Wiederherstellung. Dazu kommt Datensparsamkeit als bester
Schutz, denn was nicht gespeichert ist, kann nicht abfließen; vom
Endkunden führen wir nur den Familiennamen.

**Was passiert, wenn OXOMI ausfällt?**

Bekannte Artikel kommen aus dem eigenen Artikel-Cache, dort ändert sich
nichts. Neue Artikel warten in der Warteschlange und werden automatisch
nachgeholt, sobald OXOMI wieder antwortet; der Badverkäufer sieht einen
ehrlichen Status statt einer Fehlermeldung. Da die Mappe erst am
Folgetag fertig sein muss, ist eine Störung von Stunden ärgerlich, aber
kein Prozessbruch.

**Warum eine eigene Zwischenschicht für die KI statt direkter
Anbindung?**

Weil sich der KI-Markt schneller dreht als unser Werkzeug. Modelle,
Preise und Bedingungen ändern sich im Quartalsrhythmus; mit der
Zwischenschicht wechsle ich Anbieter oder Modell per Konfiguration und
prüfe die Qualität gegen ein festes Testset, statt das Tool umzubauen.
Dieselbe Schicht liefert nebenbei die Kostentransparenz je Mappe, die
die Wirtschaftlichkeitsrechnung braucht.

**Skaliert das auch deutlich über 500 Mappen hinaus?**

Ja, weil die Lastträger horizontal skalieren: Mehr Mappen bedeuten mehr
parallele Hintergrundaufträge an derselben Warteschlange, und der
Artikel-Cache sorgt dafür, dass der teuerste Schritt pro zusätzlicher
Mappe im Schnitt sogar billiger wird. Die Auslegung und der Lasttest
laufen auf das Dreifache des Mengengerüsts; darüber hinaus wächst das
System durch zusätzliche Arbeiter, nicht durch Umbau.
