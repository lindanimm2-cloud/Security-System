'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingButton } from '@/components/LoadingButton';
import { CartIcon } from '@/components/icons/CartIcon';
import type { LoyaltySummary } from '@/components/loyalty/LoyaltySummaryCard';
import { clientApi, publicApi, type ApiResponse } from '@/lib/api-client';
import { useCart } from './CartProvider';
import { useSiteClient } from './SiteClientProvider';

type Step = 'cart' | 'checkout' | 'done';

function money(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

export function CartDrawer() {
  const {
    cart,
    cartCount,
    cartTotalCents,
    drawerOpen,
    setDrawerOpen,
    updateQty,
    removeLine,
    clearCart,
  } = useCart();
  const { session, profile, fullName, ready } = useSiteClient();
  const [step, setStep] = useState<Step>('cart');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [orderDone, setOrderDone] = useState<string | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltySummary | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    notes: '',
  });

  useEffect(() => {
    if (!drawerOpen) return;
    if (cart.length === 0 && step !== 'done') setStep('cart');
  }, [drawerOpen, cart.length, step]);

  useEffect(() => {
    if (!ready || !profile) return;
    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || fullName || '',
      customerEmail: prev.customerEmail || profile.email,
      customerPhone: prev.customerPhone || profile.phone || '',
    }));
  }, [ready, profile, fullName]);

  useEffect(() => {
    if (!drawerOpen || !session) {
      setLoyalty(null);
      return;
    }
    let cancelled = false;
    clientApi
      .get<ApiResponse<LoyaltySummary>>('/client/loyalty')
      .then((res) => {
        if (!cancelled) {
          setLoyalty(res.data);
          if (res.data.activePromoCode) setDiscountCode(res.data.activePromoCode);
        }
      })
      .catch(() => {
        if (!cancelled) setLoyalty(null);
      });
    return () => {
      cancelled = true;
    };
  }, [drawerOpen, session]);

  if (!drawerOpen) return null;

  const loyaltyPercent = loyalty?.effectiveDiscountPercent ?? 0;
  const estimatedDiscount =
    session && loyaltyPercent > 0
      ? Math.floor((cartTotalCents * loyaltyPercent) / 100)
      : 0;
  const estimatedTotal = Math.max(0, cartTotalCents - estimatedDiscount);

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    if (!cart.length) return;
    setPlacing(true);
    setError('');
    try {
      const res = await publicApi<{
        success: boolean;
        data: { orderNumber: string };
      }>('/store/checkout', {
        method: 'POST',
        body: JSON.stringify({
          tenantSlug: profile?.tenant.slug ?? 'demo',
          ...form,
          customerUserId: session?.user.id,
          discountCode: discountCode.trim() || undefined,
          items: cart.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity,
          })),
        }),
      });
      setOrderDone(res.data.orderNumber);
      clearCart();
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setPlacing(false);
    }
  }

  function close() {
    setDrawerOpen(false);
    if (step === 'done') {
      setOrderDone(null);
      setStep('cart');
    }
  }

  const needsLicence = cart.some((l) => l.product.requiresLicense);

  return (
    <div className="nx-drawer-backdrop" onClick={close} role="presentation">
      <aside
        className="nx-drawer nx-drawer--cart"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Shopping cart"
      >
        <div className="nx-drawer-head">
          <div>
            <p className="nx-eyebrow">Nexus Supply</p>
            <h2 className="nx-drawer-head__title">
              {step !== 'done' && step !== 'checkout' && (
                <CartIcon size={22} className="nx-drawer-head__cart-icon" />
              )}
              {step === 'done'
                ? 'Order placed'
                : step === 'checkout'
                  ? 'Checkout'
                  : `Cart (${cartCount}${cart.length ? ` · ${cart.length} lines` : ''})`}
            </h2>
          </div>
          <button type="button" className="nx-btn nx-btn--ghost" onClick={close}>
            Close
          </button>
        </div>

        {step !== 'done' && (
          <div className="nx-cart-steps" aria-hidden>
            <span className={step === 'cart' ? 'is-active' : 'is-done'}>1 Cart</span>
            <span className={step === 'checkout' ? 'is-active' : ''}>2 Details</span>
          </div>
        )}

        {session && step !== 'done' && (
          <div className="nx-cart-account-banner">
            <div>
              <strong>Signed in as {fullName ?? session.user.email}</strong>
              <p>
                Active client account — checkout details are prefilled from your
                Nexus profile.
              </p>
            </div>
            <Link href="/account" className="nx-btn nx-btn--ghost nx-btn--sm" onClick={close}>
              Account
            </Link>
          </div>
        )}

        {!session && step === 'checkout' && (
          <div className="nx-cart-account-banner nx-cart-account-banner--guest">
            <div>
              <strong>Shop as guest</strong>
              <p>
                Checkout without an account, or sign in to link the order to your
                protection profile.
              </p>
            </div>
            <Link href="/account" className="nx-btn nx-btn--outline nx-btn--sm" onClick={close}>
              Sign in
            </Link>
            <Link
              href="/account?mode=register"
              className="nx-btn nx-btn--ghost nx-btn--sm"
              onClick={close}
            >
              Create account
            </Link>
          </div>
        )}

        {step === 'done' && orderDone && (
          <div className="nx-cart-done">
            <div className="nx-success">
              Order <strong>{orderDone}</strong> received.
            </div>
            <p>
              A Nexus advisor will confirm licensing, delivery, and any install
              scheduling. {session ? 'The order is linked to your client account.' : ''}
            </p>
            <div className="nx-cart-done-actions">
              {session ? (
                <Link href="/account" className="nx-btn nx-btn--primary" onClick={close}>
                  View account
                </Link>
              ) : (
                <>
                  <Link
                    href="/account?mode=register"
                    className="nx-btn nx-btn--primary"
                    onClick={close}
                  >
                    Create account
                  </Link>
                  <Link href="/account" className="nx-btn nx-btn--outline" onClick={close}>
                    Sign in
                  </Link>
                </>
              )}
              <button type="button" className="nx-btn nx-btn--outline" onClick={close}>
                Keep shopping
              </button>
            </div>
          </div>
        )}

        {step === 'cart' && (
          <>
            {cart.length === 0 ? (
              <div className="nx-cart-empty">
                <div className="nx-cart-empty__icon" aria-hidden>
                  <CartIcon size={36} />
                </div>
                <p>Your cart is empty.</p>
                <Link href="/store" className="nx-btn nx-btn--primary" onClick={close}>
                  Browse catalog
                </Link>
              </div>
            ) : (
              <>
                <ul className="nx-cart-lines">
                  {cart.map((line) => {
                    const lineTotal = line.product.priceCents * line.quantity;
                    return (
                      <li key={line.product.id}>
                        <div className="nx-cart-line-media" aria-hidden>
                          {line.product.imageEmoji}
                        </div>
                        <div className="nx-cart-line-body">
                          <div className="nx-cart-line-top">
                            <strong>{line.product.name}</strong>
                            <button
                              type="button"
                              className="nx-cart-remove"
                              onClick={() => removeLine(line.product.id)}
                            >
                              Remove
                            </button>
                          </div>
                          <p className="nx-muted">
                            {line.product.priceFormatted}
                            {line.product.requiresLicense ? ' · Licence required' : ''}
                          </p>
                          <div className="nx-cart-line-footer">
                            <div className="nx-qty-stepper">
                              <button
                                type="button"
                                aria-label="Decrease quantity"
                                onClick={() =>
                                  updateQty(line.product.id, line.quantity - 1)
                                }
                              >
                                −
                              </button>
                              <span>{line.quantity}</span>
                              <button
                                type="button"
                                aria-label="Increase quantity"
                                disabled={line.quantity >= line.product.stock}
                                onClick={() =>
                                  updateQty(line.product.id, line.quantity + 1)
                                }
                              >
                                +
                              </button>
                            </div>
                            <strong>{money(lineTotal)}</strong>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="nx-cart-summary">
                  <div>
                    <span>Subtotal</span>
                    <strong>{money(cartTotalCents)}</strong>
                  </div>
                  {session && loyaltyPercent > 0 && (
                    <div>
                      <span>Loyalty ({loyaltyPercent}% off)</span>
                      <strong>−{money(estimatedDiscount)}</strong>
                    </div>
                  )}
                  <div>
                    <span>Delivery</span>
                    <span className="nx-muted">Quoted after order</span>
                  </div>
                  {needsLicence && (
                    <p className="nx-cart-licence-note">
                      One or more items require a valid licence — sales will
                      verify before fulfilment.
                    </p>
                  )}
                  {session && loyalty && (
                    <p className="nx-muted" style={{ marginTop: '0.5rem' }}>
                      Loyalty: {loyalty.tierName} · {loyaltyPercent}% off applied
                      at checkout
                      {loyalty.activePromoCode
                        ? ` · promo ${loyalty.activePromoCode}`
                        : ''}
                      .
                    </p>
                  )}
                  <div className="nx-cart-summary-total">
                    <span>Estimated total</span>
                    <strong>{money(estimatedTotal)}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="nx-btn nx-btn--primary nx-btn--block"
                  onClick={() => setStep('checkout')}
                >
                  Continue to checkout
                </button>
              </>
            )}
          </>
        )}

        {step === 'checkout' && cart.length > 0 && (
          <form className="nx-checkout-form nx-checkout-form--v2" onSubmit={placeOrder}>
            <div className="nx-checkout-mini">
              <span>
                {cartCount} item{cartCount === 1 ? '' : 's'}
              </span>
              <strong>{money(estimatedTotal)}</strong>
              <button type="button" className="nx-linkish" onClick={() => setStep('cart')}>
                Edit cart
              </button>
            </div>

            {session && (
              <label>
                Promo code (optional)
                <input
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder="e.g. GEAR15"
                />
              </label>
            )}
            {session && loyaltyPercent > 0 && (
              <p className="nx-muted">
                Loyalty {loyaltyPercent}% off will be applied at checkout
                ({money(estimatedTotal)} after discount).
              </p>
            )}

            <label>
              Full name
              <input
                required
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                value={form.customerEmail}
                onChange={(e) =>
                  setForm({ ...form, customerEmail: e.target.value })
                }
              />
            </label>
            <label>
              Phone
              <input
                value={form.customerPhone}
                onChange={(e) =>
                  setForm({ ...form, customerPhone: e.target.value })
                }
              />
            </label>
            <label>
              Delivery / site address
              <textarea
                required
                rows={3}
                placeholder="Street, suburb, city, gate codes…"
                value={form.shippingAddress}
                onChange={(e) =>
                  setForm({ ...form, shippingAddress: e.target.value })
                }
              />
            </label>
            <label>
              Notes (install / licence)
              <textarea
                rows={2}
                placeholder="Install window, licence numbers, site contact…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>

            {error && <ErrorAlert error={error} />}

            <LoadingButton
              type="submit"
              className="nx-btn nx-btn--primary nx-btn--block"
              loading={placing}
              loadingLabel="Placing order…"
            >
              {`Place order · ${money(estimatedTotal)}`}
            </LoadingButton>
            <p className="nx-muted nx-checkout-fineprint">
              Demo checkout — no card charge. Orders create a sales follow-up in
              the Nexus control room.
            </p>
          </form>
        )}
      </aside>
    </div>
  );
}
