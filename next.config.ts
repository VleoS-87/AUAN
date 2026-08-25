import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Die Artikel-Testliste liegt als Datei im Repo und wird zur Laufzeit gelesen.
  // Damit sie in der Serverless-Funktion ankommt, muss sie mitgepackt werden.
  outputFileTracingIncludes: {
    '/dev/oxomi-test': ['./testdaten/artikel/*.csv'],
    '/api/dev/oxomi-test': ['./testdaten/artikel/*.csv'],
  },

  // AUAN ist ein internes Werkzeug. Nichts davon gehoert in eine Suchmaschine.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ];
  },
};

export default nextConfig;
