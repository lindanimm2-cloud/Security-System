'use client';

import { MobileBottomNav, type MobileBottomNavItem } from '@/components/nav/MobileBottomNav';

export function SiteMobileBottomNav() {
  const items: MobileBottomNavItem[] = [
    { href: '/', label: 'Home', icon: 'home', exact: true },
    { href: '/services', label: 'Services', icon: 'services' },
    { href: '/contact', label: 'Contact', icon: 'contacts' },
    { href: '/about', label: 'About', icon: 'overview' },
    { href: '/portal/login', label: 'Portal', icon: 'account' },
  ];

  return (
    <MobileBottomNav
      items={items}
      className="mobile-bottom-nav--site"
      ariaLabel="Site"
    />
  );
}
