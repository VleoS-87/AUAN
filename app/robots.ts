import type { MetadataRoute } from 'next';

// Internes Werkzeug: nichts davon gehoert in eine Suchmaschine.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: '/' }] };
}
