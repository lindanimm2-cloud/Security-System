import type { Metadata } from 'next';
import { Barlow_Condensed, Source_Sans_3 } from 'next/font/google';
import { SiteClientProvider } from '@/components/site/SiteClientProvider';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteMobileBottomNav } from '@/components/site/SiteMobileBottomNav';
import { SiteMotion } from '@/components/site/SiteMotion';
import '../nx-enterprise.css';

const display = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-nx-display',
  display: 'swap',
});

const body = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nx-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: '4DS Nexus',
    template: '%s — 4DS Nexus',
  },
  description:
    '4DS Nexus — close protection, private escort, mobile protection, and rapid response.',
};

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`nx-site nx-site--with-bottom-nav ${display.variable} ${body.variable}`}
    >
      <SiteClientProvider>
        <SiteHeader />
        <SiteMotion />
        <main className="nx-main">{children}</main>
        <SiteFooter />
        <SiteMobileBottomNav />
      </SiteClientProvider>
    </div>
  );
}
