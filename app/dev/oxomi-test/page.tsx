/**
 * Testroute fuer Stufe T-A (UEBERGABE.md Abschnitt 13).
 *
 * Zugriff nur mit Schluesselparameter, der serverseitig gegen APP_SECRET
 * geprueft wird. Zeigt je Testartikel Trefferstatus, Bilder, Fakten und
 * eCl@ss sowie eine Auswertung von Trefferquote und Luecken.
 */
import { pruefeSchluessel } from '@/lib/dev/schutz';
import { fuehrePruefungAus, type PruefErgebnisZeile } from '@/lib/dev/oxomi-pruefung';
import { kalibriere } from '@/lib/oxomi';
import type { Trefferstatus } from '@/lib/oxomi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

interface Suchparameter {
  key?: string;
  frisch?: string;
  diagnose?: string;
  modus?: string;
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
  const kalibrierModus = p.modus === 'kalibrieren';

  return (
    <main className="huelle">
      <div className="kopfzeile">
        <div>
          <h1>OXOMI-Pruefstand</h1>
          <p className="leise">
            Stufe T-A. Alle Artikel aus der Testliste laufen ueber den echten OXOMI-Zugang.
          </p>
        </div>
      </div>

      <nav className="werkzeugleiste">
        <Link aktiv={!cacheUmgehen && !mitDiagnose && !kalibrierModus} schluessel={p.key!} zusatz="">
          Normal (mit Cache)
        </Link>
        <Link aktiv={cacheUmgehen && !mitDiagnose} schluessel={p.key!} zusatz="&frisch=1">
          Frisch von OXOMI
        </Link>
        <Link aktiv={mitDiagnose} schluessel={p.key!} zusatz="&frisch=1&diagnose=1">
          Mit Abrufprotokoll
        </Link>
        <Link aktiv={kalibrierModus} schluessel={p.key!} zusatz="&modus=kalibrieren">
          Kalibrierlauf
        </Link>
      </nav>

      {kalibrierModus ? (
        <Kalibrierung />
      ) : (
        <Pruefung cacheUmgehen={cacheUmgehen} mitDiagnose={mitDiagnose} />
      )}
    </main>
  );
}

function Link({
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
    <a className={aktiv ? 'aktiv' : ''} href={`/dev/oxomi-test?key=${encodeURIComponent(schluessel)}${zusatz}`}>
      {children}
    </a>
  );
}

// ---------------------------------------------------------------------------

async function Pruefung({ cacheUmgehen, mitDiagnose }: { cacheUmgehen: boolean; mitDiagnose: boolean }) {
  const stand = await fuehrePruefungAus({ cacheUmgehen, mitDiagnose });
  const a = stand.auswertung;

  return (
    <>
      <div className="karte flaeche">
        <h3>Umgebung</h3>
        <table>
          <tbody>
            <tr>
              <td style={{ width: 260 }}>OXOMI-Zugangsdaten</td>
              <td>
                {stand.umgebung.oxomiKonfiguriert ? (
                  <span className="marke gut">vollstaendig</span>
                ) : (
                  <>
                    <span className="marke schlecht">unvollstaendig</span>{' '}
                    <span className="mono">{stand.umgebung.fehlendeVariablen.join(', ')}</span>
                  </>
                )}
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
              </td>
            </tr>
            <tr>
              <td>Laufzeit dieses Durchgangs</td>
              <td>{(stand.dauerMs / 1000).toFixed(1)} Sekunden</td>
            </tr>
          </tbody>
        </table>
        {stand.testlisteFehler && (
          <p style={{ color: 'var(--farbe-fehler)', marginBottom: 0 }}>{stand.testlisteFehler}</p>
        )}
      </div>

      <h2>Auswertung</h2>
      <div className="kennzahlen">
        <Kennzahl zahl={`${a.trefferquoteProzent} %`} beschriftung="Trefferquote" />
        <Kennzahl zahl={`${a.treffer} / ${a.gesamt}`} beschriftung="Artikel gefunden" />
        <Kennzahl zahl={`${a.mitBild} / ${a.gesamt}`} beschriftung="mit Bild" />
        <Kennzahl zahl={`${a.mitFakten} / ${a.gesamt}`} beschriftung="mit Merkmalen" />
        <Kennzahl zahl={`${a.mitEclass} / ${a.gesamt}`} beschriftung="mit eCl@ss" />
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
              </tr>
            </thead>
            <tbody>
              {a.nachTyp.map((t) => (
                <tr key={t.typ}>
                  <td>{t.typ}</td>
                  <td>{t.gesamt}</td>
                  <td>{t.treffer}</td>
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
              <td style={{ width: 200 }}>Pietsch-Nr.</td>
              <td className="mono">{artikel.pietschNr ?? '-'}</td>
              <td style={{ width: 160 }}>Hersteller</td>
              <td>{artikel.hersteller ?? '-'}</td>
            </tr>
            <tr>
              <td>Werksnummer</td>
              <td className="mono">{artikel.werksnummer ?? '-'}</td>
              <td>EAN</td>
              <td className="mono">{artikel.ean ?? '-'}</td>
            </tr>
            <tr>
              <td>Art</td>
              <td>{artikel.typ || '-'}</td>
              <td>Quelle der Daten</td>
              <td>{d.quelle === 'cache' ? 'Artikel-Cache' : 'OXOMI'}</td>
            </tr>
            <tr>
              <td>Erfolgreicher Suchweg</td>
              <td>{d.suchweg ?? '-'}</td>
              <td>eCl@ss</td>
              <td>
                {d.eclass ? (
                  <>
                    <span className="mono">{d.eclass.code}</span>
                    {d.eclass.bezeichnung ? ` – ${d.eclass.bezeichnung}` : ''}
                  </>
                ) : (
                  '-'
                )}
              </td>
            </tr>
            <tr>
              <td>Kapitelvorschlag</td>
              <td>
                {d.kapitelvorschlag.kapitel ?? '-'}
                {d.kapitelvorschlag.beleg ? (
                  <span className="mono"> (aus {d.kapitelvorschlag.grundlage}: {d.kapitelvorschlag.beleg})</span>
                ) : null}
              </td>
              <td>Gefunden</td>
              <td>
                {d.bilder.length} Bilder, {d.fakten.length} Merkmale, {d.dokumente.length} Dokumente
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {d.bilder.length > 0 && (
        <div className="bilderreihe">
          {d.bilder.slice(0, 8).map((b) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={b.url} src={b.url} alt={b.titel ?? 'Produktbild aus OXOMI'} loading="lazy" />
          ))}
        </div>
      )}

      {d.fakten.length > 0 && (
        <div className="tabellenrahmen" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Merkmal</th>
                <th>Wert</th>
              </tr>
            </thead>
            <tbody>
              {d.fakten.slice(0, 20).map((f, i) => (
                <tr key={i}>
                  <td>{f.name}</td>
                  <td>
                    {f.wert}
                    {f.einheit ? ` ${f.einheit}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {d.hinweise.length > 0 && (
        <ul className="hinweise">
          {d.hinweise.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      )}

      {mitDiagnose && ergebnis.diagnose.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary>Abrufprotokoll ({ergebnis.diagnose.length} Versuche)</summary>
          <div className="tabellenrahmen" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Suchweg</th>
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
                      <div className="mono" style={{ color: 'var(--farbe-text-leise)', wordBreak: 'break-all' }}>
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

// ---------------------------------------------------------------------------

async function Kalibrierung() {
  let ergebnis;
  try {
    ergebnis = await kalibriere({
      hersteller: 'hansgrohe',
      werksnummer: '60133450',
      pietschNr: '054107001',
      ean: '4059625478899',
    });
  } catch (fehler) {
    return (
      <div className="karte">
        <h3>Kalibrierlauf nicht moeglich</h3>
        <p style={{ margin: 0 }}>{fehler instanceof Error ? fehler.message : String(fehler)}</p>
      </div>
    );
  }

  return (
    <>
      <div className="karte flaeche">
        <h3>Kalibrierlauf</h3>
        <p style={{ margin: 0 }}>
          Probiert die dokumentierten OXOMI-Dienstpfade mit einem echten Testartikel und zeigt,
          welcher antwortet. Ergebnis: {ergebnis.expiresVariante}. Zugangsdaten erscheinen nirgends.
        </p>
      </div>
      {ergebnis.zeilen.map((z) => (
        <div className="karte" key={z.pfad}>
          <div className="kopfzeile">
            <h3>
              <span className="mono">{z.pfad}</span>
            </h3>
            <span className={`marke ${z.vielversprechend ? 'gut' : 'schlecht'}`}>
              {z.httpStatus ?? 'kein Kontakt'}
            </span>
          </div>
          <p className="leise" style={{ marginBottom: 8 }}>
            {z.zweck} · {z.dauerMs} ms
          </p>
          {z.fehler && <p style={{ color: 'var(--farbe-fehler)', margin: '0 0 8px' }}>{z.fehler}</p>}
          {z.antwortAuszug && <pre className="rohdaten">{z.antwortAuszug}</pre>}
        </div>
      ))}
    </>
  );
}
