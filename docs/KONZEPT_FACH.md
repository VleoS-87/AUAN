![](media/fd675bba0b33c64d90b2fd46c8235b2a1100e287.png){width="2.2916666666666665in"
height="0.6458333333333334in"}

**Angebotsmappen-Tool für die Ausstellungen**

Fachkonzept für ein KI-gestütztes Tool zur Erstellung hochwertiger
Angebotsmappen für Fachhandwerker und deren Endkunden

  ----------------- -----------------------------------------------------
  Dokument          V1_Angebotsmappen_Konzept

  Version           V1, Entwurf zur Abstimmung

  Datum             25.08.2026

  Verantwortlich    Volker, Bereichsleitung Digitaler Vertrieb

  Vertraulichkeit   Intern, Unternehmensgruppe Pietsch
  ----------------- -----------------------------------------------------

**1. Zusammenfassung**

Die Badverkäufer unserer Ausstellungen erstellen heute nach jeder
Beratung Unterlagen für den Fachhandwerker. Was dabei fehlt, ist eine
hochwertige, endkundentaugliche Angebotsmappe: ein Dokument, das der
Fachhandwerker mit Stolz an seinen Endkunden weitergeben kann und das
die Beratung in der Ausstellung emotional und fachlich sauber
zusammenfasst. Heute entsteht so etwas nur mit hohem manuellem Aufwand
und in stark schwankender Qualität.

Das hier beschriebene Tool schließt diese Lücke. Der Badverkäufer legt
je Beratung ein Projekt an, erfasst Eckdaten, Termine und Teilnehmer,
spricht seine Eindrücke nach der Beratung als Diktat ein und lädt das
SAP-Angebot als strukturierten Export hoch. Eine KI extrahiert daraus
die exposéwerten Artikel, reichert sie über OXOMI mit Herstellerbildern
und Produktdaten an und baut nach einem gewählten Stil (modern, edel,
minimalistisch) eine druckfertige Mappe im A4-Hochformat. Vor der
Generierung prüft der Badverkäufer in einem Review-Schritt die
Artikelauswahl und alle Inhalte, danach kann er jedes Kapitel einzeln
nachbearbeiten.

Die Mappe tritt als gemeinsames Dokument von Fachhandwerker und
Ausstellung auf, beide Logos, beide Ansprechpartner. Sie enthält bewusst
keine Preise: Der Fachhandwerker kalkuliert selbst und legt sein eigenes
Angebot bei. Damit stärkt das Tool den dreistufigen Vertriebsweg, statt
ihn zu umgehen.

Zielgröße sind rund 500 Mappen pro Monat bei etwa 50 Mappen je
Ausstellung. Das Konzept beschreibt den vollständigen Funktionsumfang
der Stufe 1 inklusive Diktatfunktion und Bild-Upload aus der 3D-Planung,
die technischen Grundregeln, das Datenmodell, die drei Stilkonzepte
sowie Risiken, offene Punkte und Meilensteine bis zur Umsetzung.

**2. Ausgangslage und Problem**

Nach einer Ausstellungsberatung erstellt der Badverkäufer in SAP
(IEQ01/02) das Angebot für den Fachhandwerker. Dieses Angebot ist ein
kaufmännisches Dokument: Positionslisten, Artikelnummern, Konditionen.
Für den Endkunden ist es weder gedacht noch geeignet. Der Fachhandwerker
steht damit vor der Aufgabe, aus einer nüchternen Positionsliste eine
überzeugende Präsentation für seinen Kunden zu machen. Die meisten
Betriebe haben dafür weder Zeit noch Werkzeuge.

Die Folgen sind bekannt: Die emotionale Wirkung der Ausstellungsberatung
verpufft auf dem Weg zum Endkunden, die Entscheidungsphase zieht sich,
und die Abschlussquote bleibt hinter dem Potenzial der Beratung zurück.
Einzelne Badverkäufer bauen heute in Eigenregie Unterlagen in PowerPoint
oder Word. Das kostet je nach Anspruch mehrere Stunden pro Vorgang, ist
nicht standardisiert und hängt komplett an der Person.

Gleichzeitig liegen die Zutaten für eine hochwertige Mappe bereits vor:
Das SAP-Angebot enthält die Artikel, OXOMI liefert Herstellerbilder,
Produkttexte und Prospektseiten, und der Badverkäufer trägt das Wissen
über den Kunden, die Beratung und die Planung im Kopf. Es fehlt das
Werkzeug, das diese Zutaten mit vertretbarem Aufwand zu einem Dokument
in gleichbleibend hoher Qualität verbindet.

**3. Zielbild**

Ein Badverkäufer erstellt mit dem Tool am Tag nach der Beratung in
wenigen Minuten Nettoarbeitszeit eine Angebotsmappe, die drei Ansprüche
gleichzeitig erfüllt:

-   **Endkundentauglich:** Die Mappe liest sich wie ein
    Immobilien-Exposé für das neue Bad. Emotionale Einleitung, klare
    Kapitel je Anlagenbereich, echte Produktbilder, keine
    Artikelnummern-Wüste, keine Preise.

-   **Fachhandwerkergerecht:** Der Betrieb des Fachhandwerkers ist mit
    Logo, Profil und Ansprechpartner gleichberechtigt eingebunden. Die
    Mappe wirkt wie ein gemeinsames Dokument von Betrieb und
    Ausstellung, nicht wie Werbung des Großhandels am Handwerk vorbei.

-   **Fachlich korrekt:** Alle Produktfakten stammen aus Herstellerdaten
    (OXOMI), nicht aus freier KI-Formulierung. Die Artikelauswahl folgt
    der Logik eines erfahrenen Badverkäufers: Designobjekte rein,
    Kleinteile raus, Unterputztechnik sinnvoll zusammengefasst.

Der Prozess ist so gebaut, dass die KI die Fleißarbeit übernimmt und der
Badverkäufer an zwei Stellen die Kontrolle behält: einmal vor der
Generierung (Artikel- und Inhalts-Review) und einmal danach
(kapitelweise Nachbearbeitung). Zeitdruck besteht nicht, die Mappe muss
am Folgetag der Beratung fertig sein können; in der Regel hat der
Badverkäufer drei Tage, bis das Gesamtpaket aus SAP-Angebot und Mappe
beim Fachhandwerker sein muss.

**3.1 Was das Tool bewusst nicht ist**

-   Kein Preis- oder Kalkulationstool. Preise erscheinen nirgends in der
    Mappe, der Fachhandwerker kalkuliert und legt sein eigenes Angebot
    bei.

-   Kein Endkundenportal. Versandweg ist immer Ausstellung an
    Fachhandwerker, Fachhandwerker an Endkunde.

-   Kein Ersatz für SAP. Das Angebot entsteht weiterhin in SAP, das Tool
    konsumiert nur den Export.

-   Zunächst kein Teil der Kojen- bzw. Ausstellungsplattform. Beide
    Vorhaben werden getrennt gedacht; die Artikel-Anreicherung über
    OXOMI ist aber so zu bauen, dass sie später als gemeinsamer Baustein
    dienen kann.

**4. Nutzer, Rollen und Mengengerüst**

  -----------------------------------------------------------------------
  **Rolle**          **Beschreibung**
  ------------------ ----------------------------------------------------
  Badverkäufer       Einzige aktive Nutzergruppe im Tool. Legt Projekte
                     an, erfasst Inhalte, prüft, generiert, versendet.
                     Pflegt das eigene Beraterprofil (Ausstellung,
                     Kontaktdaten, Position, Mail, Foto optional).

  Fachhandwerker     Kein Tool-Nutzer. Wird in der FHW-Verwaltung mit
                     Eckdaten und Logo gepflegt, erhält die fertige Mappe
                     per Mail oder gedruckt und gibt sie an seinen
                     Endkunden weiter.

  Endkunde           Empfänger der Mappe über den Fachhandwerker. Taucht
                     im Tool nur mit Familiennamen und den
                     beratungsbezogenen Angaben auf.

  Administration     Legt Nutzerkonten an, verwaltet Ausstellungen und
                     Stammtexte (z. B. Spruch-Bibliothek). Im MVP
                     schlank, kann durch den digitalen Vertrieb
                     wahrgenommen werden.
  -----------------------------------------------------------------------

Mengengerüst als Planungsgrundlage: rund 500 Mappen pro Monat über alle
Ausstellungen, etwa 50 Mappen je Ausstellung und Monat. Das entspricht
bei einem Badverkäuferteam je Ausstellung einer täglichen Nutzung und
macht zwei Dinge klar: Erstens muss der Prozess pro Mappe schnell und
robust sein, zweitens sind die laufenden KI- und Betriebskosten pro
Mappe eine relevante Steuergröße und werden als offener Punkt vor der
Umsetzung beziffert.

**5. Verbindliche Grundregeln**

Diese Regeln gelten für Konzept und Umsetzung als harte Anforderungen.
Sie sind bewusst kurz gehalten, weil an ihnen die Seriosität des
gesamten Vorhabens hängt.

  -----------------------------------------------------------------------
  **Regel**            **Begründung und Umsetzung**
  -------------------- --------------------------------------------------
  Keine Preise in der  Die Mappe ist ein reines Exposé. Preisspalten aus
  Mappe                dem SAP-Export werden beim Import verworfen und
                       nicht gespeichert, nicht nur ausgeblendet. Damit
                       ist ausgeschlossen, dass Einkaufskonditionen des
                       Fachhandwerkers das System erreichen oder je in
                       einem Dokument auftauchen.

  Bilder nur aus       Die Mappe wird gedruckt und weitergegeben, das ist
  lizenzierten Quellen rechtlich eine Veröffentlichung. Produktbilder
                       kommen ausschließlich aus OXOMI bzw.
                       Herstellermedien oder aus eigenen Uploads (JPGs
                       der 3D-Planung, eigene Fotos). Webrecherche
                       liefert nur Fakten und Textinformationen, niemals
                       Bilder.

  Fakten nur aus Daten Maße, Materialien, Farben und Serienbezeichnungen
                       stammen aus OXOMI-Daten oder manueller Eingabe.
                       Die KI formuliert Texte, erfindet aber keine
                       Produkteigenschaften. Gibt es zu einem Artikel
                       keine belastbaren Daten, gibt es auch keine
                       Faktenangaben, nur den redaktionellen Text.

  Marken-Duo           Fachhandwerker und Ausstellung treten als Partner
  gleichberechtigt     auf: beide Logos, beide Profile, beide
                       Ansprechpartner. Kein Auftritt der Ausstellung am
                       Fachhandwerker vorbei.

  Datensparsamkeit     Vom Endkunden wird nur erfasst, was die Mappe
                       braucht: Familienname und beratungsbezogene
                       Inhalte. Projekte erhalten ein Löschkonzept, die
                       KI-Verarbeitung läuft über einen Dienst mit
                       Auftragsverarbeitungsvertrag. Details in Kapitel
                       12.
  -----------------------------------------------------------------------

**6. Fachliches Objektmodell: Projekt und Mappe**

Der zentrale und statische Anker jedes Projekts ist der Endkunde. Ein
Projekt gehört genau einem Endkunden und bündelt alles, was zu dessen
Badvorhaben gehört: Termine, Teilnehmer, Notizen, Diktate, Bilder und
Angebote.

Unterhalb des Projekts können mehrere Mappen existieren. Das ist bewusst
so angelegt, weil die Praxis es verlangt: Ein Vorhaben kann in
Teilbereiche zerfallen (etwa Hauptbad und Gäste-WC), es kann sein, dass
nur ein Teil zum Auftrag wird, und es kann sich in einem Bereich etwas
ändern, ohne dass die übrigen Mappen angefasst werden müssen. Jede Mappe
basiert auf genau einem hochgeladenen SAP-Angebot bzw. Angebotsstand.

Auch der Fachhandwerker ist auf Projektebene bewusst nicht fest
verdrahtet: Er kann im Projektverlauf wechseln. Das Projekt trägt daher
eine aktuelle FHW-Zuordnung, die änderbar ist. Bei der Generierung einer
Mappe wird der zu diesem Zeitpunkt zugeordnete Fachhandwerker mit Logo
und Profil in die Mappe übernommen und dort als Stand eingefroren. Ein
späterer FHW-Wechsel ändert bestehende Mappen nicht, neue Mappen laufen
automatisch auf den neuen Betrieb.

**6.1 Struktur im Überblick**

-   Projekt: ein Endkunde (statisch), ein verantwortlicher Badverkäufer,
    eine Ausstellung, aktuelle FHW-Zuordnung (wechselbar), Termine,
    Teilnehmer, Notizen und Diktate, Bild-Uploads.

-   Mappe (0 bis n je Projekt): ein SAP-Angebotsimport, die daraus
    kuratierte Artikelauswahl, Stilwahl, generierte Kapitel, Status
    (Entwurf, in Prüfung, final, versendet), eingefrorener FHW- und
    Berater-Stand.

-   Änderung am Angebot: Ein neuer Angebotsstand wird als neuer Import
    an derselben Mappe hochgeladen. Das Tool zeigt den Unterschied (neue
    Positionen, entfallene Positionen) und übernimmt bestehende manuelle
    Bearbeitungen für unveränderte Artikel. So überlebt Handarbeit ein
    V2-Angebot.

**7. Der Prozess von der Beratung bis zur Mappe**

Der Gesamtprozess gliedert sich in acht Phasen. Die Phasen 1 bis 4 sind
Erfassung, 5 und 6 sind Analyse und Kontrolle, 7 und 8 sind Erstellung
und Versand.

  ---------------------------------------------------------------------------
  **Nr.**   **Phase**           **Inhalt**
  --------- ------------------- ---------------------------------------------
  1         Projekt anlegen     Vor der Beratung: Der Badverkäufer legt nach
                                dem Login ein Projekt an und erfasst die
                                Eckdaten: FHW-Firma (aus der FHW-Verwaltung
                                gewählt oder neu angelegt), Familienname des
                                Endkunden, Badberater, Projektname.

  2         Beratung und Diktat Während oder direkt nach der
                                Ausstellungsberatung: Termin(e) der
                                Besichtigung, Teilnehmer und Ansprechpartner,
                                eigene Eindrücke und Besonderheiten. Alle
                                Freitextfelder sind wahlweise tipp- oder
                                diktierbar, auch mobil am Tablet oder Handy.

  3         SAP-Angebot         Wie heute: Der Badverkäufer schreibt das
            erstellen           Angebot in SAP (IEQ01/02) und exportiert es
                                als strukturierte Datei (Excel/CSV). Die
                                genauen Exportspalten sind mit der IT zu
                                klären, siehe offene Punkte.

  4         Upload am Projekt   Der Export wird an der Mappe hochgeladen.
                                Zusätzlich lädt der Badverkäufer vorhandene
                                JPGs aus der 3D-Planung hoch und ordnet jedes
                                Bild zu: Bereich (Waschtisch, Dusche, Wanne,
                                WC/Urinal usw.) oder Typ (Gesamtansicht,
                                Draufsicht, Maßzeichnung, Titelbild).

  5         KI-Analyse          Die KI liest den Export, verwirft
                                Preisspalten, identifiziert die exposéwerten
                                Artikel, ordnet sie Kapiteln zu, matcht sie
                                gegen OXOMI und bereitet eine Zusammenfassung
                                aller Eingaben als prüfbare Bulletpoints auf.
                                Details in Kapitel 8.

  6         Review              Der Badverkäufer sieht die Artikelauswahl
                                (gewählt und nicht gewählt) und korrigiert
                                per Klick. Je Artikel ist der OXOMI-Status
                                sichtbar; bei fehlendem Treffer kann er
                                Werksnummer und Hersteller direkt am Artikel
                                nacherfassen oder Bild und Text manuell
                                einpflegen. Auch die Bulletpoints zu
                                Terminen, Teilnehmern und Notizen sind hier
                                editierbar.

  7         Stilwahl und        Der Badverkäufer wählt einen der drei Stile
            Generierung         (modern, edel, minimalistisch). Die KI
                                generiert die vollständige Mappe: Einleitung,
                                Kapitel je Anlagenbereich mit Texten und
                                Bildern, Kontaktseite, Rückseite.

  8         Feinschliff und     Jedes Kapitel kann einzeln nachbearbeitet
            Versand             oder neu generiert werden. Ist alles final,
                                erzeugt das Tool das druckfertige PDF im
                                A4-Hochformat. Versand per Mail an den
                                Fachhandwerker oder Druck in der Ausstellung.
  ---------------------------------------------------------------------------

**8. Die KI-Pipeline im Detail**

**8.1 Import des SAP-Angebots**

Der Import erwartet eine strukturierte Datei (Excel/CSV). Als
Minimalspalten werden Pietsch-Artikelnummer, Artikelbezeichnung und
Menge vorausgesetzt; im besten Fall liefert der Export zusätzlich
Herstellername und Werksnummer je Position. Welche Spalten der
SAP-Export tatsächlich hergibt, ist der wichtigste offene Klärungspunkt
mit der IT, weil davon der Aufwand im Matching abhängt. Preis- und
Konditionsspalten werden beim Einlesen erkannt und verworfen, bevor
irgendetwas gespeichert wird.

**8.2 Matching-Kaskade je Position**

Jede Angebotsposition durchläuft eine Kaskade, bis sie einem
darstellbaren Artikel zugeordnet ist:

  ------------------------------------------------------------------------------
  **Stufe**   **Weg**                 **Beschreibung**
  ----------- ----------------------- ------------------------------------------
  1           Werksnummer und         Liegen beide vor, wird direkt in OXOMI
              Hersteller              nach dem Artikel gesucht. Sicherster und
                                      schnellster Weg.

  2           Pietsch-Artikelnummer   Liegt nur die Pietsch-Nummer vor, wird
                                      über eine Zuordnung auf Hersteller und
                                      Werksnummer aufgelöst. Die Quelle dieser
                                      Zuordnung (Bestandsdaten, Export, Pflege
                                      im Tool) ist ein offener Punkt; die Nummer
                                      eignet sich in jedem Fall auch als
                                      einfacher Schlüssel für händische
                                      Nacherfassung.

  3           Manuelle Eingabe        Kein automatischer Treffer: Der
                                      Badverkäufer trägt Werksnummer und
                                      Hersteller direkt am Artikel im Review
                                      nach, das Matching läuft erneut.

  4           Serienartikel bei       Ausstellungstypische Individualartikel
              Individualware          (Beispiel: Unterschrank mit individuellen
                                      Griffen und Sonderfarbe) sind in SAP nicht
                                      als Katalogartikel angelegt, bekannt sind
                                      nur Serie und Hersteller. Hier wählt der
                                      Badverkäufer den übergeordneten
                                      Serienartikel als Darstellungsgrundlage;
                                      der Text kann die Individualisierung
                                      erwähnen.

  5           Manueller Artikel       Gibt es auch dafür keine brauchbaren
                                      Daten, pflegt der Badverkäufer Bild und
                                      Text selbst ein. Erwartung laut
                                      OXOMI-Abdeckung: betrifft rund 10 Prozent
                                      der Fälle, vor allem Individualware.
  ------------------------------------------------------------------------------

**8.3 Auswahl und Kapitelzuordnung**

Die Auswahl der exposéwerten Artikel folgt der Logik eines erfahrenen
Badverkäufers und Fachhandwerksmeisters, in Regeln gegossen und durch
die KI angewendet:

-   Sichtbare, gestalterisch relevante Artikel kommen in die Mappe:
    Waschtische, Möbel, WCs, Armaturen, Wannen, Duschabtrennungen,
    Accessoires mit Designanspruch, Heizkörper mit Gestaltungswert.

-   Funktionsware bleibt draußen: Eckventile, Siphons, Befestigungen,
    Dichtstoffe. Ausnahme: Es handelt sich erkennbar um Designobjekte
    (z. B. Design-Siphon am freistehenden Waschtisch).

-   Unterputztechnik (Spülkästen, Unterputz-Armaturenkörper,
    Installationselemente) wird nicht einzeln präsentiert, sondern zu
    einem kompakten Kapitel Unterputztechnik zusammengefasst, das die
    verbaute Qualität benennt, ohne den Endkunden mit Technik zu
    überfrachten.

Da der SAP-Export keine Warengruppen liefert und im MVP keine
Artikeldatenbank angebunden wird, stützt sich die Kapitelzuordnung auf
zwei Quellen: die eCl@ss-Klassifikation, die OXOMI am Artikel
mitliefert, als strukturierte Grundlage, und die KI-Bewertung von
Bezeichnung und Herstellerdaten als Ergänzung. Beides zusammen ergibt
einen Vorschlag, den der Badverkäufer im Review mit einem Klick
korrigieren kann. Die Trefferquote dieser Zuordnung ist vor der
Umsetzung mit realen Angeboten zu testen, siehe Meilensteine.

**8.4 Anreicherung und Textgenerierung**

Für jeden gewählten Artikel sammelt das Tool aus OXOMI die verfügbaren
Inhalte: Produktbilder, Langtexte, Attribute und gegebenenfalls
Prospektseiten. Ergänzend darf eine Webrecherche Fakten und
Formulierungshilfen zu Serie und Hersteller liefern, ausdrücklich keine
Bilder. Aus diesem Material generiert die KI je Artikel einen prägnanten
redaktionellen Text, der zum gewählten Stil und zur Beratungssituation
passt, plus eine getrennt gerenderte Faktenzeile mit den belegten
Kerndaten (z. B. Breite, Material, Farbe, Serie).

Die Personalisierung speist sich aus den Projektangaben: Familienname
des Endkunden, Bezug auf den Ausstellungsbesuch und die Termine,
Eindrücke aus den Diktaten des Badverkäufers und das Profil des
Fachhandwerkers. So entsteht eine Mappe, die erkennbar für diesen Kunden
und diesen Betrieb geschrieben ist und nicht wie ein Serienbrief wirkt.

**9. Aufbau der Mappe**

Die Mappe erscheint im A4-Hochformat und folgt einem festen Grundgerüst,
das der gewählte Stil gestalterisch und sprachlich ausprägt. Jeder
Anlagenbereich umfasst mit seiner Zusammenfassung ein bis zwei Seiten
und überschreitet nie drei Seiten.

  -----------------------------------------------------------------------
  **Abschnitt**          **Inhalt**
  ---------------------- ------------------------------------------------
  Titelseite             Titelbild (bevorzugt das als Titelbild markierte
                         JPG aus der 3D-Planung, ersatzweise eine
                         Gesamtansicht), Projektname, Familienname des
                         Endkunden, Logos von Fachhandwerker und
                         Ausstellung, Datum.

  Einleitung             Emotionale, zur Designsprache des Stils passende
                         Präsentation des fertigen Projekts: was das neue
                         Bad ausmacht, welcher Charakter es prägt. Bezug
                         auf den Ausstellungsbesuch mit Termin(en) und
                         Teilnehmern. Hier wird die Gesamtansicht bzw.
                         Draufsicht der Planung eingebunden.

  Kapitel je Anlage      Für jeden im Projekt vorhandenen Bereich ein
                         eigenes Kapitel: Waschtischanlage, WC-Anlage,
                         Urinal, Wannenanlage, Duschanlage,
                         Unterputztechnik, Ausstattungsgegenstände,
                         Wärmequellen. Aufbau je Kapitel: exposéreife,
                         fachlich korrekte Einleitung, was diesen Bereich
                         in diesem Bad ausmacht, danach die prägnanten
                         Artikel mit echtem Produktbild, redaktionellem
                         Text und Faktenzeile. Zugeordnete Planungsbilder
                         des Bereichs werden im Kapitel platziert.

  Maßzeichnung           Als Maßzeichnung markierte Uploads erscheinen
                         gesammelt auf einer eigenen Seite im hinteren
                         Teil, damit die Kapitel emotional bleiben und
                         die Technik trotzdem dokumentiert ist.

  Kontaktseite           Profil des Fachhandwerksbetriebs (aus der
                         FHW-Verwaltung, KI-gestützt zu einem kurzen
                         Portrait aufbereitet) und Profil des Badberaters
                         mit Ausstellung, Position und Kontaktdaten.
                         Klarer Hinweis, an wen sich der Endkunde mit
                         welchen Fragen wendet: Ausführung und Angebot an
                         den Fachhandwerker, Produkt- und
                         Ausstellungsfragen an den Badberater.

  Rückseite              Schlicht gehalten: im Footer beide Logos, mittig
                         ein kurzer, prägnanter Spruch, der das Vertrauen
                         unterstreicht. Die Sprüche kommen aus einer
                         kuratierten Bibliothek je Stil, damit hier
                         nichts Beliebiges generiert wird.
  -----------------------------------------------------------------------

Ansprache des Endkunden: Empfehlung ist die Sie-Form, da die Mappe im
Namen des Fachhandwerkers bei dessen Kunden ankommt und dort ein
professionelles, respektvolles Auftreten erwartet wird. Beispiele für
Rückseiten-Sprüche: \"Gute Bäder entstehen aus Vertrauen.\" / \"Ihr Bad.
Unser Handwerk.\" / \"Vom ersten Eindruck bis zum letzten Handgriff.\"

**10. Die drei Stilkonzepte**

Die Stilwahl steuert Layout und Texttonalität gemeinsam, beides ist
bewusst gekoppelt. Gestalterische Basis aller drei Stile ist im MVP der
badpunkt-Stil: cleanes Schwarz-Weiß-Fundament, serifenlose Typografie,
hochwertige Lifestyle-Bildsprache, Understatement statt visueller
Überladung. Da das CI der künftigen Ausstellungsmarke Bad Ambiente
gerade neu entsteht, ist nach der MVP-Phase eine gestalterische
Anpassung der Templates eingeplant; die Stilkonzepte sind deshalb so
angelegt, dass Farben, Logos und Schriften zentral austauschbar sind.

Die folgenden Konzepte sind auf Basis aktueller Bad-Designsprache
entwickelt und werden vor der Umsetzung praktisch validiert: Je Stil
entsteht eine vollständige Beispielmappe mit identischem Musterprojekt,
die mit Badverkäufern und ausgewählten Fachhandwerkern getestet wird.

**10.1 Modern**

-   Layout: klare Geometrie, kräftige Bildanschnitte, großzügige
    Produktfotos, markante Kapitelauftakte, Akzentfarbe pointiert
    eingesetzt.

-   Typografie: serifenlos, kräftige Schnitte für Headlines, hohe
    Kontraste.

-   Bildsprache: architektonische Perspektiven, formstarke
    Designstatements, der Waschtisch als Blickfang.

-   Tonalität: frisch, direkt, selbstbewusst. Kurze Sätze, aktive
    Sprache.

-   Textprobe: \"Klare Linien, starke Formen: Ihr neues Bad bringt
    Design und Alltag zusammen, ohne Kompromisse.\"

**10.2 Edel**

-   Layout: viel Weißraum, ruhige Seitenarchitektur, feine Linien,
    zurückhaltende Flächen in warmen Grau- und Erdtönen (Greige, Taupe),
    Bilder in ruhigen, großzügigen Formaten.

-   Typografie: serifenlose Grundschrift, elegante Auszeichnungen,
    größere Durchschüsse für gehobene Anmutung.

-   Bildsprache: Quiet Luxury, hochwertige Materialien ohne Prunk,
    Naturstein, warme Oberflächen, weiches Licht.

-   Tonalität: ruhig, gehoben, substanziell. Längere, fließende Sätze,
    Betonung von Material, Handwerk und Beständigkeit.

-   Textprobe: \"Ein Ort der Ruhe, gestaltet mit ausgesuchten
    Materialien und einem Anspruch, der bleibt.\"

**10.3 Minimalistisch**

-   Layout: maximale Reduktion, monochromes Farbkonzept, viel Luft, ein
    Bild und wenige Zeilen je Einheit, keine dekorativen Elemente.

-   Typografie: eine Schriftfamilie, wenige Schriftgrößen, präzise
    Ausrichtung.

-   Bildsprache: elegante Reduktion, freigestellte Produkte oder sehr
    ruhige Rauminszenierungen, konzentriertes Weiß.

-   Tonalität: knapp, präzise, klar. Kurze Aussagen, kein Schmuck.

-   Textprobe: \"Reduziert auf das Wesentliche. Ihr Bad.\"

**11. Datenmodell (Skizze)**

Die folgende Skizze beschreibt die fachlichen Entitäten und ihre
Kernfelder als Grundlage für das technische Feinkonzept.

  -------------------------------------------------------------------------
  **Entität**         **Kernfelder**                    **Anmerkung**
  ------------------- --------------------------------- -------------------
  Ausstellung         Name, Standort, Logo/Marke,       Stammdaten, zentral
                      Mail-Absender                     gepflegt

  Berater             Name, Mail (Login), Ausstellung,  Selbstpflege durch
                      Position, Telefon, Foto optional, den Badverkäufer
                      Passwort                          

  Fachhandwerker      Firma, Ansprechpartner, Adresse,  Manuelle Anlage im
                      Kontaktdaten, Logo, Eckdaten für  MVP, keine
                      das Profil (Gründung,             Schnittstelle
                      Schwerpunkte, Team)               

  Projekt             Endkunde (Familienname),          Endkunde ist der
                      Projektname, Badverkäufer,        statische Anker
                      Ausstellung, aktueller FHW,       
                      Status                            

  Termin              Datum, Art (Besichtigung), Notiz  0 bis n je Projekt

  Teilnehmer          Name, Rolle/Funktion, Zuordnung   0 bis n je Projekt
                      (Endkundenseite, FHW,             
                      Ausstellung)                      

  Notiz/Diktat        Freitext, Audioquelle ja/nein,    Diktat wird zu
                      Zeitstempel                       editierbarem Text

  Bild-Upload         Datei (JPG), Zuordnung Bereich    Quelle: 3D-Planung,
                      oder Typ (Gesamtansicht,          eigene Fotos
                      Draufsicht, Maßzeichnung,         
                      Titelbild)                        

  Mappe               Projekt, Angebotsimport, Stil,    0 bis n je Projekt
                      Status, eingefrorener             
                      FHW/Berater-Stand, generierte     
                      Kapitel                           

  Angebotsimport      Datei, Importdatum,               Preisspalten werden
                      Positionsliste                    verworfen

  Position/Artikel    Pietsch-Nr., Bezeichnung, Menge,  Herzstück des
                      Hersteller, Werksnummer,          Review
                      OXOMI-Status, Kapitel, exposéwert 
                      ja/nein, manuelle Inhalte         

  Stil-Template       Layoutdefinition,                 Zentral
                      Tonalitätsvorgaben,               austauschbar
                      Farb-/Logovarianten               (CI-Wechsel)

  Spruch-Bibliothek   Spruch, Stil-Zuordnung            Kuratiert, keine
                                                        freie Generierung
  -------------------------------------------------------------------------

**12. Technische Eckpunkte in Alltagssprache**

**12.1 Anmeldung und Geräte**

Im MVP meldet sich jeder Badverkäufer mit seiner Mailadresse und einem
Passwort an. Beim ersten Login gilt ein Standardpasswort (Pietsch2026),
das sofort durch ein eigenes ersetzt werden muss. Eine Anbindung an die
zentrale Windows-Anmeldung (M365) ist bewusst erst für später
vorgesehen, damit der Start ohne IT-Projekt möglich ist.

Das Tool ist eine Webanwendung im Browser, nichts muss installiert
werden. Am PC in der Ausstellung läuft der volle Funktionsumfang. Am
Tablet oder Handy sind gezielt zwei Dinge nutzbar: das Diktieren von
Notizen direkt nach der Beratung und das Nachschauen von Projektständen.

**12.2 Diktatfunktion**

Das Diktat funktioniert wie eine Sprachnachricht: Der Badverkäufer
drückt auf Aufnahme, spricht seine Eindrücke ein, und ein
Spracherkennungsdienst wandelt die Aufnahme in Text um. Der Text landet
im Notizfeld des Projekts und bleibt dort ganz normal editierbar; die
Audioaufnahme selbst wird nach der Umwandlung gelöscht. Der eingesetzte
Dienst muss europäischen Datenschutzregeln genügen und per
Auftragsverarbeitungsvertrag gebunden sein, weil in Diktaten Namen und
persönliche Eindrücke vorkommen.

**12.3 Datenschutz und Löschkonzept**

-   Es werden nur die Daten erfasst, die die Mappe braucht. Vom
    Endkunden genügt der Familienname; Adressen oder weitere persönliche
    Daten des Endkunden werden nicht erhoben.

-   Projekte erhalten eine Aufbewahrungsfrist, nach deren Ablauf sie
    automatisch gelöscht oder anonymisiert werden. Die konkrete Frist
    wird mit dem Datenschutzbeauftragten festgelegt (offener Punkt).

-   Alle KI- und Sprachdienste laufen über Verträge zur
    Auftragsverarbeitung. Es werden keine Projektdaten zum Training
    fremder Modelle freigegeben.

-   Einkaufskonditionen des Fachhandwerkers erreichen das System
    konstruktionsbedingt nicht (Verwerfen beim Import, Kapitel 5).

**12.4 Ausgabeformate**

Primärformat ist ein druckfertiges PDF im A4-Hochformat, für Mailversand
und Ausdruck gleichermaßen. Zusätzlich wurden Word und PowerPoint als
Alternativen geprüft:

-   Word: technisch möglich, aber mit Risiko für die Layouttreue; ein
    anspruchsvolles Layout verrutscht in Word schnell, sobald jemand
    darin arbeitet. Der eigentliche Bedarf hinter dem Word-Wunsch,
    nämlich Nachbearbeitung, wird im Tool selbst über den Kapitel-Editor
    gelöst.

-   PowerPoint: A4-Hochformat ist als Folienformat möglich (eine Seite
    je Folie) und eine denkbare Ausbaustufe für Badverkäufer, die Mappen
    im Termin präsentieren wollen.

Empfehlung: Stufe 1 liefert ausschließlich PDF und investiert die
Energie in einen guten Kapitel-Editor. Word- oder PowerPoint-Export wird
als Ausbaustufe eingeplant, falls sich der Bedarf in der Praxis
bestätigt.

**12.5 Abgrenzung zur Kojen-Plattform**

Das Angebotsmappen-Tool und die Kojen- bzw. Ausstellungsplattform
(QR-Codes an Kojen) werden zunächst als getrennte Anwendungen gedacht.
Beide brauchen aber denselben technischen Kernbaustein: die Anreicherung
eines Artikels über Hersteller und Werksnummer mit OXOMI-Daten (Bilder,
Texte, Attribute). Anforderung an die Umsetzung ist deshalb, diese
Artikel-Anreicherung als eigenen, wiederverwendbaren Baustein zu bauen,
den perspektivisch beide Anwendungen nutzen. Das vermeidet doppelte
Entwicklung und doppelte Pflege, ohne die Projekte aneinander zu ketten.

**13. Oberflächen im Überblick**

  -----------------------------------------------------------------------
  **Screen**              **Zweck**
  ----------------------- -----------------------------------------------
  Login                   Anmeldung mit Mailadresse und Passwort,
                          Erstlogin mit Passwortwechsel.

  Projektliste            Alle eigenen Projekte mit Status, Suche und
                          Filter (Ausstellung, Status, FHW). Einstieg in
                          Neuanlage.

  Projekt-Neuanlage       Eckdaten: FHW (wählen oder neu), Familienname
                          Endkunde, Badberater, Projektname.

  Projektdetail           Reiter für Eckdaten, Termine und Teilnehmer,
                          Notizen und Diktate, Bilder, Mappen. Mobil in
                          reduzierter Ansicht mit Fokus auf Diktat und
                          Nachschau.

  Mappe: Upload           SAP-Export hochladen, Importergebnis mit
                          Positionsübersicht.

  Mappe: Review           Zweigeteilte Artikelansicht (gewählt / nicht
                          gewählt) mit Klick-Übernahme in beide
                          Richtungen, OXOMI-Status je Artikel,
                          Nacherfassung von Werksnummer und Hersteller,
                          manuelle Bild- und Texteingabe,
                          Kapitelzuordnung per Auswahl, editierbare
                          Bulletpoints der Projektangaben.

  Mappe: Stil und         Stilwahl mit Vorschau je Stil, Start der
  Generierung             Generierung, Fortschrittsanzeige.

  Mappe: Kapitel-Editor   Kapitelnavigation, Text je Kapitel editieren
                          oder einzeln neu generieren lassen,
                          Bildplatzierung prüfen, Vorschau der
                          Gesamtmappe.

  Mappe: Finalisierung    PDF erzeugen, per Mail an den FHW senden (mit
                          kurzem Anschreiben) oder herunterladen und
                          drucken.

  FHW-Verwaltung          Fachhandwerker anlegen und pflegen: Eckdaten,
                          Ansprechpartner, Logo-Upload. Aus den Eckdaten
                          erzeugt die KI einen Profiltext-Vorschlag für
                          die Kontaktseite, der editierbar ist.

  Mein Profil             Eigene Daten des Badverkäufers: Ausstellung,
                          Position, Kontaktdaten, Foto optional,
                          Passwort.
  -----------------------------------------------------------------------

**14. Abgrenzung der Stufe 1 (MVP)**

Stufe 1 umfasst den vollständigen fachlichen Prozess. Bewusst enthalten
sind auch Diktatfunktion und Bild-Upload, weil beides für die Akzeptanz
im Alltag der Badverkäufer entscheidend ist. Schlank gehalten wird Stufe
1 an den Rändern: bei Schnittstellen, Anmeldung und Auswertung.

  -----------------------------------------------------------------------
  **In Stufe 1 enthalten**            **Bewusst nicht in Stufe 1**
  ----------------------------------- -----------------------------------
  Projekte mit Endkunden-Anker,       Schnittstelle zum SAP-Kundenstamm
  mehreren Mappen und wechselbarem    (FHW-Anlage bleibt manuell)
  FHW                                 

  Diktatfunktion (auch mobil) und     Anbindung einer Artikeldatenbank
  JPG-Upload mit Zuordnung            oder Warengruppenlogik

  SAP-Excel/CSV-Import mit            M365/Entra-Login (Stufe 1: Mail und
  Matching-Kaskade und                Passwort)
  OXOMI-Anreicherung                  

  Review-Schritt und kapitelweiser    Word- und PowerPoint-Export
  Editor                              

  Drei Stile auf badpunkt-Basis       Bad-Ambiente-CI (folgt nach
  inklusive gekoppelter Tonalität     Neugestaltung als Template-Tausch)

  PDF-Ausgabe A4 hoch, Mailversand an Freigabe-Workflow durch den FHW im
  den FHW                             Tool

  FHW-Verwaltung mit Logo und         Auswertungen und Kennzahlen (Mappen
  KI-Profiltext                       je Ausstellung, Durchlaufzeiten)

  Berater-Profile in Selbstpflege     Integration mit der Kojen-Plattform
                                      (nur gemeinsamer OXOMI-Baustein als
                                      Bauprinzip)
  -----------------------------------------------------------------------

**15. Wirtschaftlichkeit**

Eine belastbare Rechnung setzt zwei Messwerte voraus, die vor der
Umsetzung erhoben werden und als offene Punkte geführt sind: der heutige
Zeitaufwand für eine manuell erstellte Unterlage vergleichbarer Qualität
und die tatsächlichen KI- und Betriebskosten je Mappe im Pilotbetrieb.
Beide Werte werden nicht geschätzt, sondern gemessen.

Die Wirkungslogik ist unabhängig davon klar: Bei rund 500 Mappen pro
Monat wird aus jeder eingesparten Stunde je Vorgang ein erheblicher
Kapazitätsgewinn im Verkauf, und jede Mappe wirkt zusätzlich als
Qualitätssignal in den dreistufigen Vertriebsweg hinein. Der
konservative Ansatz für die Entscheidungsvorlage: Nutzenrechnung
ausschließlich über die gemessene Zeitersparnis, Abschlussquoten-Effekte
werden als Chance benannt, aber nicht eingerechnet. Der maximale Verlust
im Misserfolgsfall beschränkt sich auf die Entwicklungskosten der Stufe
1 und die laufenden Kosten des Pilotbetriebs; ein Ausstieg ist nach dem
Pilot jederzeit möglich, weil keine Alt-Prozesse abgelöst werden.

**16. Risiken und Absicherung**

  ---------------------------------------------------------------------------------
  **Risiko**            **Wirkung**                **Absicherung**
  --------------------- -------------------------- --------------------------------
  Bildrechte            Abmahnungen bei            Harte Regel: Bilder nur aus
                        ungeklärten Bildquellen in OXOMI, Herstellermedien und
                        einem veröffentlichten     eigenen Uploads. Webrecherche
                        Dokument                   liefert nie Bilder.

  Fachliche Fehler in   Vertrauensverlust bei FHW  Fakten nur aus Daten, getrennte
  KI-Texten             und Endkunde,              Faktenzeile, doppelte Kontrolle
                        Reklamationen              durch Review und Kapitel-Editor.

  Einkaufskonditionen   Vertrauensbruch gegenüber  Preisspalten werden beim Import
  im System             dem FHW, falls EK-Preise   verworfen und nie gespeichert.
                        sichtbar würden            

  OXOMI-Lücken (ca. 10  Mehraufwand je Mappe,      Manuelle Bild- und Textpflege am
  %)                    unvollständige Kapitel     Artikel, Serienartikel-Lösung
                                                   für Individualware, Messung der
                                                   Trefferquote im Pilot.

  Kapitelzuordnung ohne Falsch einsortierte        eCl@ss aus OXOMI plus
  Warengruppen          Artikel, Nacharbeit        KI-Vorschlag plus
                                                   Ein-Klick-Korrektur im Review;
                                                   Trefferquote ist Gate vor dem
                                                   Rollout.

  Akzeptanz der         Tool wird umgangen,        Diktat und Mobilnutzung von
  Badverkäufer          Mengenziel verfehlt        Anfang an, Review als
                                                   Klickstrecke statt
                                                   Formularwüste, Pilot mit einer
                                                   Ausstellung und echten
                                                   Vorgängen, Feedbackschleife vor
                                                   dem Rollout.

  Datenschutz           Beanstandungen wegen       Datensparsamkeit, Löschkonzept,
                        personenbezogener Daten in Auftragsverarbeitungsverträge,
                        KI-Verarbeitung            Abstimmung mit dem
                                                   Datenschutzbeauftragten vor dem
                                                   Pilot.

  CI-Wechsel zu Bad     Doppelarbeit an den        Templates von Beginn an mit
  Ambiente              Templates                  zentral austauschbaren Farben,
                                                   Logos und Schriften; der
                                                   CI-Wechsel wird ein
                                                   Template-Tausch, kein Umbau.
  ---------------------------------------------------------------------------------

**17. Offene Punkte**

Alle offenen Punkte des Konzepts an einer Stelle. Kein Punkt blockiert
die Konzeptfreigabe, die Punkte 1 bis 3 blockieren den Baustart.

  -----------------------------------------------------------------------------
  **Nr.**   **Punkt**                                 **Klärung mit**
  --------- ----------------------------------------- -------------------------
  1         SAP-Export: Welche Spalten liefert der    IT / SAP-Team
            Angebots-Export konkret (Pietsch-Nr.,     
            Bezeichnung, Menge, Hersteller,           
            Werksnummer)? Lässt sich der Export je    
            Ausstellung standardisieren?              

  2         Quelle für die Zuordnung                  IT / Stammdaten
            Pietsch-Artikelnummer zu Hersteller und   
            Werksnummer, falls der Export beides      
            nicht direkt liefert                      

  3         OXOMI-Praxistest: Trefferquote und        Digitaler Vertrieb
            eCl@ss-Abdeckung mit 20 bis 30 Artikeln   
            aus realen Ausstellungsangeboten,         
            inklusive Eigenmarken (Sanibel, Scalido,  
            4YOU)                                     

  4         KI- und Betriebskosten je Mappe (Messung  Digitaler Vertrieb /
            im Pilot) sowie heutiger Zeitaufwand je   Ausstellung
            manuell erstellter Unterlage              
            (Referenzmessung)                         

  5         Hosting und Betriebsmodell der            IT
            Webanwendung                              

  6         Aufbewahrungs- und Löschfristen für       Datenschutzbeauftragter
            Projekte, AVV-Prüfung der KI- und         
            Sprachdienste                             

  7         Produktname des Tools (Arbeitstitel:      Digitaler Vertrieb /
            Angebotsmappe)                            Marketing

  8         Kuratierte Spruch-Bibliothek für die      Digitaler Vertrieb /
            Rückseite (Startumfang je Stil)           Marketing

  9         Bad-Ambiente-CI: Zeitplan der             Marketing
            Neugestaltung, damit der Template-Tausch  
            nach dem MVP eingeplant werden kann       
  -----------------------------------------------------------------------------

**18. Meilensteine und Gates**

  ----------------------------------------------------------------------------
  **Stufe**   **Meilenstein**                       **Gate (Weiter nur wenn)**
  ----------- ------------------------------------- --------------------------
  M1          Freigabe dieses Konzepts              Fachliche Träger
                                                    (Ausstellungsleitung,
                                                    digitaler Vertrieb) tragen
                                                    Prozess und Regeln mit.

  M2          Technische Klärung:                   OXOMI-Trefferquote und
              SAP-Exportspalten, Nummern-Zuordnung, Datenqualität tragen das
              OXOMI-Praxistest mit realen Artikeln  Konzept; sonst
                                                    Nachschärfen der
                                                    Matching-Kaskade.

  M3          Design-Validierung: drei              Badverkäufer und
              Beispielmappen (je Stil eine) mit     ausgewählte Fachhandwerker
              identischem Musterprojekt             bewerten die Mappen als
                                                    weitergabefähig an
                                                    Endkunden.

  M4          Bau der Stufe 1 und Pilot mit einer   Messwerte liegen vor: Zeit
              Ausstellung über einen vollen Monat   je Mappe, Kosten je Mappe,
              (Ziel: reale Vorgänge, Richtwert 50   Nacharbeitsquote,
              Mappen)                               Zufriedenheit der Piloten.

  M5          Rollout auf alle Ausstellungen,       Pilot-Gates erfüllt,
              danach Ausbaustufen (M365-Login,      Betriebsmodell steht.
              Kundenstamm-Anbindung, Auswertungen,  
              ggf. PowerPoint-Export,               
              Bad-Ambiente-CI)                      
  ----------------------------------------------------------------------------

**19. Anhang: Fragen und Antworten**

**Warum reicht nicht eine gute Word-Vorlage?**

Eine Vorlage löst das Layout, aber nicht die Arbeit. Der Aufwand steckt
im Zusammensuchen von Bildern und Produktdaten, im Formulieren und im
Personalisieren, und genau das übernimmt das Tool. Außerdem stellt die
Vorlage keine Datenqualität sicher: Ich bekomme mit dem Tool geprüfte
Herstellerbilder und belegte Fakten, mit einer Vorlage bekomme ich
Copy-and-paste in schwankender Qualität.

**Was passiert, wenn OXOMI einen Artikel nicht kennt?**

Dann greift eine gestufte Lösung: Nacherfassung von Werksnummer und
Hersteller direkt am Artikel, bei Individualware der übergeordnete
Serienartikel, und als letzte Stufe die manuelle Pflege von Bild und
Text. Nach heutiger Einschätzung betrifft das rund zehn Prozent der
Artikel. Die tatsächliche Quote messe ich im Pilot, sie ist ein hartes
Gate vor dem Rollout.

**Warum stehen keine Preise in der Mappe?**

Weil die Mappe sonst den Fachhandwerker entmachten würde. Er kalkuliert
selbst und legt sein eigenes Angebot bei; die Mappe liefert ihm die
Präsentationsqualität, die er allein nicht wirtschaftlich herstellen
kann. Zusätzlich ist so konstruktiv ausgeschlossen, dass
Einkaufskonditionen den Endkunden erreichen: Preisdaten werden beim
Import verworfen und existieren im System nicht.

**Wie stelle ich sicher, dass die KI nichts erfindet?**

Durch Trennung von Fakten und Formulierung. Produktdaten kommen aus
OXOMI oder manueller Eingabe und werden als eigene Faktenzeile
gerendert; die KI formuliert nur den redaktionellen Text darum herum.
Dazu kommen zwei Kontrollpunkte durch den Badverkäufer, vor der
Generierung und je Kapitel danach. Ohne Datengrundlage gibt es keine
Faktenangabe, das ist eine Grundregel des Konzepts.

**Was kostet das im laufenden Betrieb?**

Die Kosten je Mappe hängen von KI-Nutzung, Sprachumwandlung und Hosting
ab und werden im Pilot gemessen statt geschätzt. Bei 500 Mappen pro
Monat rechne ich konservativ: Die Nutzenrechnung stütze ich
ausschließlich auf die gemessene Zeitersparnis der Badverkäufer, alles
Weitere (bessere Abschlussquoten, Bindung der Fachhandwerker) ist
Chance, nicht Rechengrundlage.

**Warum wird das nicht gleich mit der Kojen-Plattform zusammengebaut?**

Weil beide Vorhaben unterschiedliche Nutzer, unterschiedliche Reifegrade
und unterschiedliche Risiken haben und sich gegenseitig ausbremsen
würden. Was beide brauchen, die OXOMI-Artikelanreicherung, wird als
gemeinsamer Baustein gebaut. So bleibt jedes Projekt für sich beweglich,
und die Technik wird trotzdem nur einmal entwickelt.

**Was ist mit dem Markenwechsel zu Bad Ambiente?**

Der ist eingeplant, ohne dass er den Start verzögert. Die Stufe 1 nutzt
den badpunkt-Grundstil, die Templates sind aber von Beginn an so gebaut,
dass Farben, Logos und Schriften zentral getauscht werden. Sobald das
neue CI steht, ist der Wechsel ein Template-Tausch und kein Umbau.
