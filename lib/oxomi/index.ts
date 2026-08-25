/**
 * OXOMI-Anreicherungsbaustein - oeffentliche Schnittstelle.
 *
 * Alles, was ausserhalb dieses Ordners gebraucht wird, wird hier exportiert.
 * Das Modul kennt weder AUAN-Projekte noch Mappen und laesst sich deshalb
 * spaeter unveraendert von einem zweiten Projekt mitnutzen
 * (UEBERGABE.md Abschnitt 5).
 */
export type {
  AnreicherungsOptionen,
  ArtikelBild,
  ArtikelDaten,
  ArtikelDokument,
  ArtikelFakt,
  ArtikelSchluessel,
  AufrufDiagnose,
  EclassInfo,
  Kapitel,
  Kapitelvorschlag,
  OxomiKennung,
  Trefferstatus,
} from './types.ts';

export {
  reichereAn,
  reichereMehrereAn,
  type AnreicherungsErgebnis,
  type AnreicherungsUmgebung,
} from './anreicherung.ts';

export {
  bildeCacheSchluessel,
  speicherCache,
  type ArtikelCacheSpeicher,
  type CacheEintrag,
} from './cache.ts';

export { postgresCache } from './cache-postgres.ts';
export { postgresLieferanten } from './lieferanten-postgres.ts';
export {
  speicherLieferanten,
  normalisiereHerstellername,
  herstellerSchluessel,
  type LieferantenSpeicher,
  type LieferantZuordnung,
} from './lieferanten.ts';

export { schlageKapitelVor, ECLASS_KAPITEL } from './kapitel.ts';
export { istPreisFeld, entfernePreisfelder } from './preissperre.ts';
export { fehlendeZugangsdaten, istKonfiguriert, ladeKonfiguration, loesePortalKennung } from './config.ts';
export { werteProduktAus, type Auswertung } from './auswertung.ts';
export { loeseGtinAuf, holeProduktdaten, ohneGeheimnis, type AufrufSpur, type ClientUmgebung } from './client.ts';
export { pruefeVerbindung, type Verbindungsbericht } from './verbindung.ts';
export { Drossel } from './http.ts';
export {
  ABFRAGEARTEN,
  GTIN_AUFLOESEN,
  PRODUKTDATEN_V1,
  PRODUKTDATEN_V2,
  type OxomiProdukt,
} from './endpunkte.ts';
