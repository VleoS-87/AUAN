/**
 * OXOMI-Zugangstoken nach dem Verfahren INT63:
 *
 *   accessToken = md5(secret + md5(secret + portal + user + expires + roles))
 *
 * Das Shared Secret verlaesst diesen Server nie; an OXOMI geht nur das
 * errechnete Token.
 *
 * `expires` ist nicht der Zeitstempel des Tagesbeginns, sondern die TAGESNUMMER:
 * der UNIX-Zeitstempel in Sekunden ganzzahlig geteilt durch 86400. Ein Token
 * gilt damit effektiv einen Tag; OXOMI rechnet auf seiner Seite dasselbe und
 * laesst eine Toleranz ueber den Datumswechsel hinaus zu. Belegt in der
 * OXOMI-Dokumentation INT63, gemessen und bestaetigt im Kalibrierlauf.
 *
 * `expires` wird deshalb auch NICHT als Anfrageparameter mitgeschickt - OXOMI
 * leitet den Wert selbst aus dem Datum ab. In der Parameterliste der
 * Produktauskunft kommt er nicht vor.
 */
import { createHash } from 'node:crypto';

const SEKUNDEN_JE_TAG = 86_400;

function md5(text: string): string {
  return createHash('md5').update(text, 'utf8').digest('hex');
}

/**
 * Tagesnummer als Ablaufwert.
 * @param tagesOffset 0 = heute (Standard). Andere Werte nur fuer den Kalibrierlauf.
 */
export function berechneExpires(jetztMs: number = Date.now(), tagesOffset = 0): number {
  return Math.floor(jetztMs / 1000 / SEKUNDEN_JE_TAG) + tagesOffset;
}

export interface TokenEingabe {
  secret: string;
  portal: string;
  user: string;
  expires: number;
  /** Komma-getrennte Rollenliste. Leer, wenn keine Rollen mitgeschickt werden. */
  rollen: string;
}

export function berechneAccessToken(e: TokenEingabe): string {
  const innen = md5(`${e.secret}${e.portal}${e.user}${e.expires}${e.rollen}`);
  return md5(`${e.secret}${innen}`);
}

export interface Zugangsparameter {
  portal: string;
  user: string;
  accessToken: string;
  /** Nur gesetzt, wenn Rollen benutzt werden. */
  roles?: string;
}

/**
 * Die Parameter, die jedem OXOMI-Aufruf beigelegt werden. Ohne Secret und ohne
 * expires - Letzteres steckt nur im Token.
 */
export function baueZugangsparameter(
  k: { portal: string; user: string; secret: string; rollen: string },
  jetztMs: number = Date.now(),
  tagesOffset = 0,
): Zugangsparameter {
  const expires = berechneExpires(jetztMs, tagesOffset);
  const rollen = k.rollen.trim();

  const parameter: Zugangsparameter = {
    portal: k.portal,
    user: k.user,
    accessToken: berechneAccessToken({
      secret: k.secret,
      portal: k.portal,
      user: k.user,
      expires,
      rollen,
    }),
  };
  if (rollen !== '') parameter.roles = rollen;
  return parameter;
}
