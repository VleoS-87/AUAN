/**
 * OXOMI-Zugangstoken nach dem Verfahren INT63:
 *
 *   accessToken = md5(secret + md5(secret + portal + user + expires + roles))
 *
 * Das Shared Secret verlaesst diesen Server nie; an OXOMI geht nur das
 * errechnete Token. Der Ablaufzeitpunkt wird auf ganze Tage gerundet, damit
 * ein abgefangenes Token nicht unbegrenzt gilt.
 */
import { createHash } from 'node:crypto';

const SEKUNDEN_JE_TAG = 86_400;

function md5(text: string): string {
  return createHash('md5').update(text, 'utf8').digest('hex');
}

/**
 * Ablaufzeitpunkt als UNIX-Zeitstempel, auf ganze Tage gerundet.
 * @param tagesOffset 0 = Beginn des heutigen Tages, 1 = Beginn des morgigen Tages (Standard).
 */
export function berechneExpires(jetztMs: number = Date.now(), tagesOffset = 1): number {
  const tag = Math.floor(jetztMs / 1000 / SEKUNDEN_JE_TAG);
  return (tag + tagesOffset) * SEKUNDEN_JE_TAG;
}

export interface TokenEingabe {
  secret: string;
  portal: string;
  user: string;
  expires: number;
  rollen: string;
}

export function berechneAccessToken(e: TokenEingabe): string {
  const innen = md5(`${e.secret}${e.portal}${e.user}${e.expires}${e.rollen}`);
  return md5(`${e.secret}${innen}`);
}

export interface Zugangsparameter {
  portal: string;
  user: string;
  roles: string;
  expires: string;
  accessToken: string;
}

/** Die Parameter, die jedem OXOMI-Aufruf beigelegt werden. Ohne Secret. */
export function baueZugangsparameter(
  k: { portal: string; user: string; secret: string; rollen: string },
  jetztMs: number = Date.now(),
  tagesOffset = 1,
): Zugangsparameter {
  const expires = berechneExpires(jetztMs, tagesOffset);
  return {
    portal: k.portal,
    user: k.user,
    roles: k.rollen,
    expires: String(expires),
    accessToken: berechneAccessToken({
      secret: k.secret,
      portal: k.portal,
      user: k.user,
      expires,
      rollen: k.rollen,
    }),
  };
}
