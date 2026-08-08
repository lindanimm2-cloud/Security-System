import type { Metadata } from 'next';
import { Barlow_Condensed, Source_Sans_3 } from 'next/font/google';
import { CartDrawer } from '@/components/site/CartDrawer';
import { CartProvider } from '@/components/site/CartProvider';
import { SiteClientProvider } from '@/components/site/SiteClientProvider';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteMobileBottomNav } from '@/components/site/SiteMobileBottomNav';
import { StoreHelpDock } from '@/components/site/StoreHelpDock';

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
    '4DS Nexus — mobile protection, rapid response, and professional security supply.',
};

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`nx-site nx-site--light nx-site--with-bottom-nav ${display.variable} ${body.variable}`}
      data-nx-theme="light"
    >
      <SiteClientProvider>
        <CartProvider>
          <SiteHeader />
          <main className="nx-main">{children}</main>
          <SiteFooter />
          <CartDrawer />
          <StoreHelpDock />
          <SiteMobileBottomNav />
        </CartProvider>
      </SiteClientProvider>
    </div>
  );
}
