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
  Trefferstatus,
} from './types';

export {
  reichereAn,
  reichereMehrereAn,
  type AnreicherungsErgebnis,
  type AnreicherungsUmgebung,
} from './anreicherung';

export {
  bildeCacheSchluessel,
  speicherCache,
  type ArtikelCacheSpeicher,
  type CacheEintrag,
} from './cache';

export { postgresCache } from './cache-postgres';
export { schlageKapitelVor, ECLASS_KAPITEL } from './kapitel';
export { istPreisFeld, entfernePreisfelder } from './preissperre';
export { fehlendeZugangsdaten, istKonfiguriert, ladeKonfiguration } from './config';
export { kalibriere, type KalibrierErgebnis, type KalibrierZeile } from './kalibrierung';
export { SUCHWEGE, KALIBRIER_PFADE, PRODUKT_PFAD } from './suchwege';
