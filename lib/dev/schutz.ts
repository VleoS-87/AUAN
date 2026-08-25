/**
 * Zugriffsschutz der /dev-Routen.
 *
 * Die Testrouten sind nur mit Schluesselparameter erreichbar, der serverseitig
 * gegen APP_SECRET geprueft wird (UEBERGABE.md Abschnitt 13, Stufe T-A).
 * Der Vergleich ist zeitkonstant, der Schluessel wird nie geloggt oder
 * zurueckgegeben.
 */
import { timingSafeEqual } from 'node:crypto';

export type SchutzErgebnis = { erlaubt: true } | { erlaubt: false; grund: string; httpStatus: number };

export function pruefeSchluessel(mitgegeben: string | null | undefined): SchutzErgebnis {
  const erwartet = process.env.APP_SECRET;

  if (!erwartet || erwartet.trim() === '') {
    return {
      erlaubt: false,
      grund: 'APP_SECRET ist in dieser Umgebung nicht gesetzt. Die Testroute bleibt zu.',
      httpStatus: 503,
    };
  }

  if (!mitgegeben || mitgegeben.trim() === '') {
    return { erlaubt: false, grund: 'Schluessel fehlt.', httpStatus: 401 };
  }

  const a = Buffer.from(mitgegeben, 'utf8');
  const b = Buffer.from(erwartet, 'utf8');
  const gleich = a.length === b.length && timingSafeEqual(a, b);

  return gleich ? { erlaubt: true } : { erlaubt: false, grund: 'Schluessel stimmt nicht.', httpStatus: 401 };
}
