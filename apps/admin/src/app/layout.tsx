import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import { CallShell } from '@/components/calls/CallShell';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '4DS Nexus',
    template: '%s — 4DS Nexus',
  },
  description:
    '4DS Nexus — mobile protection, rapid response, and professional security supply',
};

const themeScript = `
(function() {
  var PREF_KEY = '4ds-theme-preference';
  var LEGACY_KEY = '4ds-theme';
  function resolve(pref) {
    if (pref === 'light') return 'light';
    if (pref === 'dark') return 'dark';
    if (pref === 'schedule') {
      var h = new Date().getHours();
      return (h >= 18 || h < 6) ? 'dark' : 'light';
    }
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }
  try {
    var pref = localStorage.getItem(PREF_KEY);
    if (pref !== 'light' && pref !== 'dark' && pref !== 'system' && pref !== 'schedule') {
      var legacy = localStorage.getItem(LEGACY_KEY);
      pref = (legacy === 'light' || legacy === 'dark') ? legacy : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolve(pref || 'light'));
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <DemoModeBanner />
          <CallShell>{children}</CallShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
