/**
 * Testroute fuer Stufe T-A (UEBERGABE.md Abschnitt 13).
 *
 * Zugriff nur mit Schluesselparameter, der serverseitig gegen APP_SECRET
 * geprueft wird. Zeigt je Testartikel Trefferstatus, Bilder, Fakten und
 * Kapitelvorschlag sowie eine Auswertung von Trefferquote und Luecken.
 */
import { pruefeSchluessel } from '@/lib/dev/schutz';
import { fuehrePruefungAus, type PruefErgebnisZeile } from '@/lib/dev/oxomi-pruefung';
import type { Trefferstatus } from '@/lib/oxomi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

interface Suchparameter {
  key?: string;
  frisch?: string;
  diagnose?: string;
}

export default async function OxomiTestSeite({
  searchParams,
}: {
  searchParams: Promise<Suchparameter>;
}) {
  const p = await searchParams;
  const schutz = pruefeSchluessel(p.key);

  if (!schutz.erlaubt) {
    return (
      <main className="huelle">
        <h1>Kein Zugriff</h1>
        <p className="leise">{schutz.grund}</p>
        <p className="leise">
          Die Seite ist nur mit gueltigem Schluessel erreichbar:
          <span className="mono"> /dev/oxomi-test?key=…</span>
        </p>
      </main>
    );
  }

  const cacheUmgehen = p.frisch === '1';
  const mitDiagnose = p.diagnose === '1';
  const schluessel = p.key ?? '';

  return (
    <main className="huelle">
      <div className="kopfzeile">
        <div>
          <h1>OXOMI-Pruefstand</h1>
          <p className="leise">
            Stufe T-A. Alle Artikel der Testliste laufen ueber den echten OXOMI-Zugang.
          </p>
        </div>
      </div>

      <nav className="werkzeugleiste">
        <Verweis aktiv={!cacheUmgehen && !mitDiagnose} schluessel={schluessel} zusatz="">
          Normal (mit Cache)
        </Verweis>
        <Verweis aktiv={cacheUmgehen && !mitDiagnose} schluessel={schluessel} zusatz="&frisch=1">
          Frisch von OXOMI
        </Verweis>
        <Verweis aktiv={mitDiagnose} schluessel={schluessel} zusatz="&frisch=1&diagnose=1">
          Mit Abrufprotokoll
        </Verweis>
      </nav>

      <Pruefung cacheUmgehen={cacheUmgehen} mitDiagnose={mitDiagnose} />
    </main>
  );
}

function Verweis({
  aktiv,
  schluessel,
  zusatz,
  children,
}: {
  aktiv: boolean;
  schluessel: string;
  zusatz: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className={aktiv ? 'aktiv' : ''}
      href={`/dev/oxomi-test?key=${encodeURIComponent(schluessel)}${zusatz}`}
    >
      {children}
    </a>
  );
}

// ---------------------------------------------------------------------------

async function Pruefung({
  cacheUmgehen,
  mitDiagnose,
}: {
  cacheUmgehen: boolean;
  mitDiagnose: boolean;
}) {
  const stand = await fuehrePruefungAus({ cacheUmgehen, mitDiagnose });
  const a = stand.auswertung;

  return (
    <>
      <div className="karte flaeche">
        <h3>Umgebung</h3>
        <div className="tabellenrahmen">
          <table>
            <tbody>
              <tr>
                <td style={{ width: 260 }}>Verbindung zu OXOMI</td>
                <td>
                  {stand.verbindung.erreichbar && stand.verbindung.angemeldet ? (
                    <span className="marke gut">steht</span>
                  ) : stand.verbindung.erreichbar ? (
                    <span className="marke teil">erreichbar, Anmeldung offen</span>
                  ) : (
                    <span className="marke schlecht">keine Verbindung</span>
                  )}{' '}
                  {stand.verbindung.befund}
                </td>
              </tr>
              <tr>
                <td>Datenbank (Artikel-Cache)</td>
                <td>
                  {stand.umgebung.cacheAktiv ? (
                    <span className="marke gut">verbunden</span>
                  ) : (
                    <span className="marke teil">nur Arbeitsspeicher</span>
                  )}
                  {stand.umgebung.cacheEintraege !== null && (
                    <> {stand.umgebung.cacheEintraege} Eintraege in artikel_cache</>
                  )}
                  {stand.umgebung.cacheFehler && (
                    <div style={{ color: 'var(--farbe-fehler)' }}>{stand.umgebung.cacheFehler}</div>
                  )}
                </td>
              </tr>
              <tr>
                <td>Gelernte Lieferantennummern</td>
                <td>
                  {stand.lieferanten.length === 0
                    ? 'noch keine'
                    : stand.lieferanten
                        .map((l) => `${l.hersteller} = ${l.supplierNumber}`)
                        .join(' · ')}
                </td>
              </tr>
              <tr>
                <td>Laufzeit dieses Durchgangs</td>
                <td>{(stand.dauerMs / 1000).toFixed(1)} Sekunden</td>
              </tr>
            </tbody>
          </table>
        </div>
        {stand.testlisteFehler && (
          <p style={{ color: 'var(--farbe-fehler)', marginBottom: 0 }}>{stand.testlisteFehler}</p>
        )}
      </div>

      <h2>Auswertung</h2>
      <div className="kennzahlen">
        <Kennzahl zahl={`${a.trefferquoteProzent} %`} beschriftung="Trefferquote" />
        <Kennzahl zahl={`${a.treffer} / ${a.gesamt}`} beschriftung="Artikel gefunden" />
        <Kennzahl zahl={`${a.mitBild} / ${a.gesamt}`} beschriftung="mit Produktbild" />
        <Kennzahl zahl={`${a.mitMasszeichnung} / ${a.gesamt}`} beschriftung="mit Maßzeichnung" />
        <Kennzahl zahl={`${a.mitFakten} / ${a.gesamt}`} beschriftung="mit Merkmalen" />
        <Kennzahl zahl={`${a.mitKlassifikation} / ${a.gesamt}`} beschriftung="mit Klassifikation" />
        <Kennzahl zahl={`${a.mitKapitel} / ${a.gesamt}`} beschriftung="mit Kapitelvorschlag" />
      </div>

      <div className="karte">
        <h3>Nach Artikelart</h3>
        <div className="tabellenrahmen">
          <table>
            <thead>
              <tr>
                <th>Art</th>
                <th>Artikel</th>
                <th>gefunden</th>
                <th>Bilder gesamt</th>
                <th>Merkmale gesamt</th>
              </tr>
            </thead>
            <tbody>
              {a.nachTyp.map((t) => (
                <tr key={t.typ}>
                  <td>{t.typ}</td>
                  <td>{t.gesamt}</td>
                  <td>{t.treffer}</td>
                  <td>{t.bilder}</td>
                  <td>{t.fakten}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="karte">
        <h3>Luecken ({a.luecken.length})</h3>
        {a.luecken.length === 0 ? (
          <p style={{ margin: 0 }}>Keine. Alle Artikel vollstaendig angereichert.</p>
        ) : (
          <ul className="hinweise">
            {a.luecken.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </div>

      <h2>Artikel im Einzelnen</h2>
      {stand.zeilen.map((zeile, i) => (
        <ArtikelKarte key={i} zeile={zeile} mitDiagnose={mitDiagnose} />
      ))}
    </>
  );
}

function Kennzahl({ zahl, beschriftung }: { zahl: string; beschriftung: string }) {
  return (
    <div className="kennzahl">
      <div className="zahl">{zahl}</div>
      <div className="beschriftung">{beschriftung}</div>
    </div>
  );
}

const STATUS_TEXT: Record<Trefferstatus, { text: string; klasse: string }> = {
  treffer: { text: 'Treffer', klasse: 'gut' },
  teiltreffer: { text: 'Treffer, unvollstaendig', klasse: 'teil' },
  kein_treffer: { text: 'kein Treffer', klasse: 'schlecht' },
  fehler: { text: 'Stoerung', klasse: 'schlecht' },
  nicht_konfiguriert: { text: 'nicht abgefragt', klasse: 'neutral' },
};

function ArtikelKarte({ zeile, mitDiagnose }: { zeile: PruefErgebnisZeile; mitDiagnose: boolean }) {
  const { artikel, ergebnis } = zeile;
  const d = ergebnis.daten;
  const status = STATUS_TEXT[d.status];
  const produktbilder = d.bilder.filter((b) => !b.istMasszeichnung);
  const masszeichnungen = d.bilder.filter((b) => b.istMasszeichnung);

  return (
    <div className="karte">
      <div className="kopfzeile">
        <h3 style={{ maxWidth: '72%' }}>{artikel.bezeichnung}</h3>
        <span className={`marke ${status.klasse}`}>{status.text}</span>
      </div>

      <div className="tabellenrahmen">
        <table>
          <tbody>
            <tr>
              <td style={{ width: 190 }}>Pietsch-Nr.</td>
              <td className="mono">{artikel.pietschNr ?? '-'}</td>
              <td style={{ width: 160 }}>Hersteller (Angebot)</td>
              <td>{artikel.hersteller ?? '-'}</td>
            </tr>
            <tr>
              <td>Werksnummer</td>
              <td className="mono">{artikel.werksnummer ?? '-'}</td>
              <td>EAN</td>
              <td className="mono">{artikel.ean ?? '-'}</td>
            </tr>
            <tr>
              <td>In OXOMI gefuehrt als</td>
              <td className="mono">
                {d.oxomiKennung
                  ? `Lieferant ${d.oxomiKennung.supplierNumber} / Artikel ${d.oxomiKennung.supplierItemNumber}`
                  : '-'}
              </td>
              <td>Art</td>
              <td>{artikel.typ || '-'}</td>
            </tr>
            <tr>
              <td>Suchweg</td>
              <td>{d.suchweg ?? '-'}</td>
              <td>Quelle der Daten</td>
              <td>{d.quelle === 'cache' ? 'Artikel-Cache' : 'OXOMI'}</td>
            </tr>
            <tr>
              <td>Bezeichnung laut OXOMI</td>
              <td colSpan={3}>{d.bezeichnung ?? '-'}</td>
            </tr>
            <tr>
              <td>Klassifikation</td>
              <td>
                {d.klassifikation ? (
                  <>
                    <span className="mono">{d.klassifikation.code}</span>
                    {d.klassifikation.bezeichnung ? ` – ${d.klassifikation.bezeichnung}` : ''}
                    {d.klassifikation.system ? (
                      <span className="leise"> ({d.klassifikation.system})</span>
                    ) : null}
                  </>
                ) : (
                  '-'
                )}
              </td>
              <td>Kapitelvorschlag</td>
              <td>
                {d.kapitelvorschlag.kapitel ?? '-'}
                {d.kapitelvorschlag.beleg ? (
                  <span className="mono">
                    {' '}
                    (aus {d.kapitelvorschlag.grundlage}: {d.kapitelvorschlag.beleg})
                  </span>
                ) : null}
              </td>
            </tr>
            <tr>
              <td>Gefunden</td>
              <td colSpan={3}>
                {produktbilder.length} Produktbilder, {masszeichnungen.length} Maßzeichnungen,{' '}
                {d.fakten.length} Merkmale, {d.dokumente.length} Dokumente
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {produktbilder.length > 0 && (
        <>
          <h3 style={{ marginTop: 16 }}>Produktbilder</h3>
          <div className="bilderreihe">
            {produktbilder.slice(0, 8).map((b) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={b.url} src={b.url} alt={b.titel ?? 'Produktbild aus OXOMI'} loading="lazy" />
            ))}
          </div>
        </>
      )}

      {masszeichnungen.length > 0 && (
        <>
          <h3 style={{ marginTop: 16 }}>Maßzeichnungen</h3>
          <div className="bilderreihe">
            {masszeichnungen.slice(0, 6).map((b) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={b.url} src={b.url} alt={b.titel ?? 'Maßzeichnung aus OXOMI'} loading="lazy" />
            ))}
          </div>
        </>
      )}

      {d.fakten.length > 0 && (
        <>
          <h3 style={{ marginTop: 16 }}>Fakten (aus OXOMI-Daten, unveraendert)</h3>
          <div className="tabellenrahmen">
            <table>
              <thead>
                <tr>
                  <th>Schluessel</th>
                  <th>Merkmal</th>
                  <th>Wert</th>
                  <th>Herkunft</th>
                </tr>
              </thead>
              <tbody>
                {d.fakten.map((f, i) => (
                  <tr key={i}>
                    <td className="mono">{f.code ?? '-'}</td>
                    <td>{f.name}</td>
                    <td>
                      {f.wert}
                      {f.einheit ? ` ${f.einheit}` : ''}
                    </td>
                    <td>
                      {f.herkunft === 'klassifikation' ? (
                        <span className="marke gut">Klassifikation</span>
                      ) : (
                        <span className="marke teil">Beschreibungstext</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {d.eigenschaften.length > 0 && (
        <>
          <h3 style={{ marginTop: 16 }}>Eigenschaften</h3>
          <ul className="hinweise">
            {d.eigenschaften.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </>
      )}

      {d.hinweise.length > 0 && (
        <>
          <h3 style={{ marginTop: 16 }}>Hinweise</h3>
          <ul className="hinweise">
            {d.hinweise.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </>
      )}

      {mitDiagnose && ergebnis.diagnose.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary>Abrufprotokoll ({ergebnis.diagnose.length} Aufrufe)</summary>
          <div className="tabellenrahmen" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Aufruf</th>
                  <th>HTTP</th>
                  <th>Dauer</th>
                  <th>Ergebnis</th>
                </tr>
              </thead>
              <tbody>
                {ergebnis.diagnose.map((dg, i) => (
                  <tr key={i}>
                    <td>
                      {dg.beschreibung}
                      <div
                        className="mono"
                        style={{ color: 'var(--farbe-text-leise)', wordBreak: 'break-all' }}
                      >
                        {dg.urlOhneGeheimnis}
                      </div>
                    </td>
                    <td>{dg.httpStatus ?? '-'}</td>
                    <td>{dg.dauerMs} ms</td>
                    <td>
                      {dg.treffer ? 'Treffer' : (dg.fehler ?? 'kein Treffer')}
                      {dg.antwortAuszug && <pre className="rohdaten">{dg.antwortAuszug}</pre>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
