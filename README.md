# AUAN

Internes Werkzeug der Badausstellungen der Unternehmensgruppe Pietsch: aus SAP-Angeboten,
OXOMI-Produktdaten und KI-Texten entstehen hochwertige Angebotsmappen (PDF, A4 hoch) fuer
Fachhandwerker.

Verbindliche Arbeitsgrundlage ist [`UEBERGABE.md`](UEBERGABE.md). Die Volltexte der Konzepte
liegen in [`docs/`](docs/). Zwei Messberichte halten fest, was gegen die echten Systeme
gemessen wurde:

- [`docs/OXOMI_SCHNITTSTELLE.md`](docs/OXOMI_SCHNITTSTELLE.md) - Anmeldung, Dienstpfade,
  Antwortstruktur und offene Punkte der OXOMI-Anbindung
- [`docs/BEFUND_SAP_EXPORT.md`](docs/BEFUND_SAP_EXPORT.md) - das echte Spaltenschema der
  SAP-Angebotsexporte, Vorarbeit fuer T-C

## Aufbaustand

| Stufe | Inhalt | Stand |
|---|---|---|
| T-A | OXOMI-Anreicherung, Artikel-Cache, geschuetzte Testroute | zur Abnahme |
| T-B | Anmeldung, Datenmodell, Projekt-/FHW-/Beraterverwaltung | offen |
| T-C | Import, Matching-Kaskade, Review | offen |
| T-D | Stil-Templates, Generator, Kapitel-Editor, PDF | offen |
| T-E | Diktat, Bildzuordnung, Finalisierung, Loeschlauf | offen |
| T-F | Haertung, Lasttest, Abnahme | offen |

## Aufbau

```
app/                     Next.js App Router
  dev/oxomi-test/        Pruefstand fuer Stufe T-A (nur mit Schluessel)
  api/dev/               dieselben Pruefungen als JSON, Migrationslauf
lib/oxomi/               OXOMI-Anreicherungsbaustein (eigenstaendiges Modul, ohne Pfad-Alias)
lib/db/                  Datenbankzugang und versionierte Migrationen
lib/dev/                 Zugriffsschutz und Pruefstand der /dev-Routen
tests/                   Tests der heiklen Pfade (Preissperre, Token, Cache)
testdaten/               Testartikel, Planungsbilder, Logos, SAP-Exporte, Referenzmappe
```

## Entwicklung

Die Entwicklung laeuft als Cloud-Session gegen dieses Repository. Das Vercel-Projekt
`auan-nfqo` deployt jeden Push automatisch; alle Zugangsdaten liegen dort. Es gehoert
kein Geheimnis in Code, Repo oder Log.

Zwei Marker-Dateien steuern, ob der Build nach aussen telefoniert. Liegt
`scripts/KALIBRIERUNG_ANFORDERN` im Repo, prueft der Build die OXOMI-Schnittstelle;
liegt `scripts/NACHWEIS_ANFORDERN` dort, laesst er die Artikel-Testliste durch den
Baustein laufen und schreibt das Ergebnis ins Build-Protokoll. Ohne die Marker macht
der Build keine einzige Anfrage nach aussen.

```bash
npm install
npm run typecheck   # TypeScript pruefen
npm test            # Tests der heiklen Pfade
npm run build       # Produktionsbau
```

## Geschuetzte Routen

Beide sind nur mit einem Schluesselparameter erreichbar, der serverseitig gegen `APP_SECRET`
geprueft wird (zeitkonstanter Vergleich, kein Loggen des Schluessels).

| Route | Zweck |
|---|---|
| `/dev/oxomi-test?key=…` | Pruefstand T-A: Trefferstatus, Bilder, Fakten, eCl@ss je Testartikel plus Auswertung |
| `/dev/oxomi-test?key=…&frisch=1` | dasselbe, aber am Artikel-Cache vorbei direkt gegen OXOMI |
| `/dev/oxomi-test?key=…&frisch=1&diagnose=1` | zusaetzlich das Abrufprotokoll je Suchweg |
| `/api/dev/oxomi-test?key=…` | dieselbe Pruefung als JSON |
| `/api/dev/migrate?key=…` | fuehrt die versionierten Datenbankmigrationen aus (idempotent) |
