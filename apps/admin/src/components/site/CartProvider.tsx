'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CartLine, StoreProduct } from '@/lib/store-types';
import { CART_KEY } from '@/lib/store-types';

type AddOptions = { openDrawer?: boolean };

type CartContextValue = {
  cart: CartLine[];
  /** Total units in cart */
  cartCount: number;
  /** Distinct product lines */
  cartLineCount: number;
  cartTotalCents: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  lastAddedId: string | null;
  addToCart: (product: StoreProduct, qty?: number, opts?: AddOptions) => void;
  updateQty: (productId: string, quantity: number) => void;
  removeLine: (productId: string) => void;
  clearCart: () => void;
  qtyInCart: (productId: string) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    if (!lastAddedId) return;
    const t = window.setTimeout(() => setLastAddedId(null), 1200);
    return () => window.clearTimeout(t);
  }, [lastAddedId]);

  const addToCart = useCallback(
    (product: StoreProduct, qty = 1, opts?: AddOptions) => {
      if (product.stock < 1) return;
      setCart((prev) => {
        const existing = prev.find((l) => l.product.id === product.id);
        if (existing) {
          return prev.map((l) =>
            l.product.id === product.id
              ? {
                  ...l,
                  quantity: Math.min(l.quantity + qty, product.stock),
                }
              : l,
          );
        }
        return [...prev, { product, quantity: Math.min(qty, product.stock) }];
      });
      setLastAddedId(product.id);
      if (opts?.openDrawer) setDrawerOpen(true);
    },
    [],
  );

  const updateQty = useCallback((productId: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId
            ? {
                ...l,
                quantity: Math.max(0, Math.min(quantity, l.product.stock)),
              }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const removeLine = useCallback((productId: string) => {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const qtyInCart = useCallback(
    (productId: string) =>
      cart.find((l) => l.product.id === productId)?.quantity ?? 0,
    [cart],
  );

  const value = useMemo<CartContextValue>(() => {
    const cartCount = cart.reduce((n, l) => n + l.quantity, 0);
    const cartLineCount = cart.length;
    const cartTotalCents = cart.reduce(
      (n, l) => n + l.product.priceCents * l.quantity,
      0,
    );
    return {
      cart,
      cartCount,
      cartLineCount,
      cartTotalCents,
      drawerOpen,
      setDrawerOpen,
      lastAddedId,
      addToCart,
      updateQty,
      removeLine,
      clearCart,
      qtyInCart,
    };
  }, [
    cart,
    drawerOpen,
    lastAddedId,
    addToCart,
    updateQty,
    removeLine,
    clearCart,
    qtyInCart,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
