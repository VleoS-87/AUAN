/**
 * Konfiguration des OXOMI-Bausteins.
 *
 * Die Zugangsdaten kommen ausschliesslich aus Umgebungsvariablen (in Vercel
 * hinterlegt). Sie werden nie geloggt, nie ausgegeben und nie zurueckgegeben.
 */

export interface OxomiKonfiguration {
  basisUrl: string;
  portal: string;
  user: string;
  secret: string;
  rollen: string;
  /** Zeitueberschreitung je Einzelaufruf in Millisekunden. */
  zeitlimitMs: number;
  /** Hoechstzahl gleichzeitiger Aufrufe gegen OXOMI (Drosselung). */
  maxParallel: number;
  /** Mindestabstand zwischen zwei Aufrufen in Millisekunden (Drosselung). */
  mindestabstandMs: number;
  /** Anzahl Wiederholungen bei Zeitueberschreitung, 429 oder 5xx. */
  maxWiederholungen: number;
}

export const STANDARD_BASIS_URL = 'https://oxomi.com';
export const STANDARD_ROLLEN = 'shop';

/** Fehlende Zugangsdaten sind kein Absturz, sondern ein benennbarer Zustand. */
export class OxomiNichtKonfiguriertError extends Error {
  readonly fehlendeVariablen: string[];

  constructor(fehlendeVariablen: string[]) {
    super(`OXOMI-Zugangsdaten unvollstaendig: ${fehlendeVariablen.join(', ')}`);
    this.name = 'OxomiNichtKonfiguriertError';
    this.fehlendeVariablen = fehlendeVariablen;
  }
}

/** Welche Zugangsvariablen fehlen? Gibt nie Werte zurueck, nur Namen. */
export function fehlendeZugangsdaten(env: NodeJS.ProcessEnv = process.env): string[] {
  return (['OXOMI_PORTAL', 'OXOMI_USER', 'OXOMI_SECRET'] as const).filter(
    (name) => !env[name] || env[name]!.trim() === '',
  );
}

export function istKonfiguriert(env: NodeJS.ProcessEnv = process.env): boolean {
  return fehlendeZugangsdaten(env).length === 0;
}

/**
 * Die Portal-Angabe kann als reine Kennung oder als vollstaendige Portaladresse
 * hinterlegt sein (`https://oxomi.com/p/123456`). OXOMI erwartet im Aufruf die
 * Kennung, deshalb wird sie hier herausgeloest. Gemessen im Kalibrierlauf vom
 * 25.08.2026: In dieser Umgebung steht die vollstaendige Adresse.
 */
export function loesePortalKennung(roh: string): string {
  const wert = roh.trim();
  const treffer = wert.match(/\/p\/([^/?#]+)/);
  if (treffer) return treffer[1];
  if (/^https?:\/\//i.test(wert)) {
    const letzter = wert.replace(/[/?#].*$/, '').split('/').filter(Boolean).pop();
    return letzter ?? wert;
  }
  return wert;
}

export function ladeKonfiguration(env: NodeJS.ProcessEnv = process.env): OxomiKonfiguration {
  const fehlt = fehlendeZugangsdaten(env);
  if (fehlt.length > 0) throw new OxomiNichtKonfiguriertError(fehlt);

  return {
    basisUrl: (env.OXOMI_BASE_URL || STANDARD_BASIS_URL).replace(/\/+$/, ''),
    portal: loesePortalKennung(env.OXOMI_PORTAL!),
    user: env.OXOMI_USER!.trim(),
    secret: env.OXOMI_SECRET!.trim(),
    rollen: (env.OXOMI_ROLES || STANDARD_ROLLEN).trim(),
    zeitlimitMs: zahl(env.OXOMI_TIMEOUT_MS, 15_000),
    maxParallel: zahl(env.OXOMI_MAX_PARALLEL, 3),
    mindestabstandMs: zahl(env.OXOMI_MIN_ABSTAND_MS, 120),
    maxWiederholungen: zahl(env.OXOMI_MAX_WIEDERHOLUNGEN, 2),
  };
}

function zahl(roh: string | undefined, standard: number): number {
  const n = Number(roh);
  return Number.isFinite(n) && n > 0 ? n : standard;
}
