'use client';

import { MobileBottomNav, type MobileBottomNavItem } from '@/components/nav/MobileBottomNav';
import { useCart } from './CartProvider';

export function SiteMobileBottomNav() {
  const { cartCount, drawerOpen, setDrawerOpen } = useCart();

  const items: MobileBottomNavItem[] = [
    { href: '/', label: 'Home', icon: 'home', exact: true },
    { href: '/store', label: 'Shop', icon: 'grid' },
    {
      label: 'Cart',
      icon: 'bag',
      onClick: () => setDrawerOpen(true),
      badge: cartCount > 0 ? cartCount : undefined,
      active: drawerOpen,
    },
    { href: '/services', label: 'Services', icon: 'services' },
    { href: '/account', label: 'Account', icon: 'profile' },
  ];

  return (
    <MobileBottomNav
      items={items}
      className="mobile-bottom-nav--site"
      ariaLabel="Site"
    />
  );
}
