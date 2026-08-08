'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  LoyaltySummaryCard,
  type LoyaltySummary,
} from '@/components/loyalty/LoyaltySummaryCard';
import { SiteAuthForms, type SiteAuthMode } from '@/components/site/SiteAuthForms';
import { useCart } from '@/components/site/CartProvider';
import { useSiteClient } from '@/components/site/SiteClientProvider';
import { canUseClientSessionForPortal } from '@/lib/auth';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';

type AccountPanel = 'home' | 'subscription' | 'services';

type StoreOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalFormatted: string;
  createdAt: string;
  items: { productName: string; quantity: number }[];
};

type Subscription = {
  planName: string;
  tierName?: string;
  tierCode?: string;
  status: string;
  memberId: string;
  validUntil: string;
  priceFormatted?: string;
  amountDueFormatted?: string;
  isOverdue?: boolean;
  daysPastDue?: number;
  nextBillingAt?: string | null;
  lastPaidAt?: string | null;
  addons?: string[];
  activeAddonDetails?: { code: string; name: string; priceFormatted: string }[];
  access?: Record<string, boolean>;
} | null;

type PaymentRow = {
  id: string;
  reference: string;
  amountFormatted: string;
  status: string;
  kind: string;
  createdAt: string;
};

type PlansData = {
  tiers: {
    code: string;
    name: string;
    priceFormatted: string;
    description: string;
    isCurrent: boolean;
    isAvailable: boolean;
  }[];
  addons: {
    code: string;
    name: string;
    priceFormatted: string;
    description: string;
    isActive: boolean;
    isAvailable: boolean;
    category: string;
  }[];
  current: Subscription & { tierName: string };
};

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <section className="nx-section">
          <LoadingSpinner label="Loading account…" />
        </section>
      }
    >
      <AccountPageInner />
    </Suspense>
  );
}

function AccountPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, session, profile, fullName, signIn, signOut, refresh } =
    useSiteClient();
  const { cartCount, setDrawerOpen } = useCart();
  const [panel, setPanel] = useState<AccountPanel>('home');
  const [authMode, setAuthMode] = useState<SiteAuthMode>(
    searchParams.get('mode') === 'register' ? 'register' : 'signin',
  );
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [isProtectionClient, setIsProtectionClient] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltySummary | null>(null);
  const [plans, setPlans] = useState<PlansData | null>(null);
  const [charging, setCharging] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'register') setAuthMode('register');
    if (mode === 'signin') setAuthMode('signin');
  }, [searchParams]);

  useEffect(() => {
    if (profile?.phone != null) setPhoneDraft(profile.phone);
    else if (session?.user.phone) setPhoneDraft(session.user.phone);
  }, [profile, session]);

  useEffect(() => {
    if (!session) {
      setOrders([]);
      setSubscription(null);
      setPayments([]);
      setLoyalty(null);
      setPlans(null);
      setIsProtectionClient(false);
      setOrdersError('');
      setEditingProfile(false);
      setPanel('home');
      return;
    }
    let cancelled = false;
    (async () => {
      setOrdersLoading(true);
      setOrdersError('');
      const orderPromise = clientApi
        .get<ApiResponse<StoreOrder[]>>('/store/my-orders')
        .then((res) => {
          if (!cancelled) setOrders(res.data);
        })
        .catch((err) => {
          if (!cancelled) {
            setOrders([]);
            setOrdersError(
              err instanceof Error ? err.message : 'Could not load orders',
            );
          }
        });

      const subPromise = clientApi
        .get<ApiResponse<Subscription>>('/client/subscription')
        .then((res) => {
          if (!cancelled) {
            setSubscription(res.data);
            setIsProtectionClient(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSubscription(null);
            setIsProtectionClient(false);
          }
        });

      const payPromise = clientApi
        .get<ApiResponse<PaymentRow[]>>('/client/subscription/payments')
        .then((res) => {
          if (!cancelled) setPayments(res.data);
        })
        .catch(() => {
          if (!cancelled) setPayments([]);
        });

      const loyaltyPromise = clientApi
        .get<ApiResponse<LoyaltySummary>>('/client/loyalty')
        .then((res) => {
          if (!cancelled) setLoyalty(res.data);
        })
        .catch(() => {
          if (!cancelled) setLoyalty(null);
        });

      const plansPromise = clientApi
        .get<ApiResponse<PlansData>>('/client/plans')
        .then((res) => {
          if (!cancelled) setPlans(res.data);
        })
        .catch(() => {
          if (!cancelled) setPlans(null);
        });

      await Promise.all([
        orderPromise,
        subPromise,
        payPromise,
        loyaltyPromise,
        plansPromise,
      ]);
      if (!cancelled) setOrdersLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function afterAuth() {
    await refresh();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSignOut() {
    signOut();
    setEditingProfile(false);
    setProfileMsg('');
    setProfileError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.replace('/account');
  }

  function startEditProfile() {
    setProfileMsg('');
    setProfileError('');
    setPhoneDraft(profile?.phone ?? session?.user.phone ?? '');
    setEditingProfile(true);
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    setProfileError('');
    try {
      await clientApi.patch('/client/profile', {
        phone: phoneDraft.trim() || undefined,
      });
      await refresh();
      setEditingProfile(false);
      setProfileMsg('Profile saved.');
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Could not save profile',
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function payMonthly() {
    setCharging(true);
    setProfileError('');
    try {
      const res = await clientApi.post<ApiResponse<{ checkoutUrl: string }>>(
        '/client/subscription/charge-monthly',
        { checkoutBase: '/account/checkout' },
      );
      router.push(res.data.checkoutUrl);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Could not start monthly payment',
      );
    } finally {
      setCharging(false);
    }
  }

  async function startUpgrade(type: 'tier' | 'addon', code: string) {
    setUpgrading(code);
    setProfileError('');
    try {
      const body = type === 'tier' ? { tierCode: code } : { addonCode: code };
      const res = await clientApi.post<ApiResponse<{ checkoutUrl: string }>>(
        '/client/subscription/checkout',
        body,
      );
      const url = res.data.checkoutUrl.replace(
        '/portal/subscription/checkout',
        '/account/checkout',
      );
      router.push(url);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Could not start upgrade',
      );
    } finally {
      setUpgrading(null);
    }
  }

  function openPortal() {
    if (canUseClientSessionForPortal()) {
      router.push('/portal');
      return;
    }
    router.push('/portal/login?reason=site-session');
  }

  if (!ready) {
    return (
      <section className="nx-section">
        <LoadingSpinner label="Loading account…" />
      </section>
    );
  }

  if (!session) {
    return (
      <>
        <section className="nx-page-hero nx-page-hero--rich">
          <div className="nx-page-hero-inner">
            <p className="nx-eyebrow">Account</p>
            <h1>Your Nexus account</h1>
            <p>
              Sign in or create a <strong>store shop account</strong> for gear
              orders. Prefer to browse first? Shop as a guest. Premium panic-app
              access is separate — your advisor issues an invite code for that.
            </p>
          </div>
        </section>

        <section className="nx-section nx-account">
          <div className="nx-account-grid">
            <div className="nx-account-card">
              <h2>{authMode === 'register' ? 'Create account' : 'Sign in'}</h2>
              <p className="nx-muted">
                Store accounts stay on the website. Panic-app / premium
                protection needs an invite code and a separate portal login.
              </p>
              <SiteAuthForms
                mode={authMode}
                onModeChange={(next) => {
                  setAuthMode(next);
                  router.replace(
                    next === 'register' ? '/account?mode=register' : '/account',
                    { scroll: false },
                  );
                }}
                onPasswordSignIn={signIn}
                onSignedIn={afterAuth}
                authSource="site"
                accountKind="store"
              />
            </div>

            <aside className="nx-account-side">
              <div className="nx-aside-card">
                <h3>Shop as guest</h3>
                <p className="nx-muted">
                  Browse and check out without creating a protection account.
                  Guest orders stay with the store — you can request cover later
                  if you need live protection.
                </p>
                <Link href="/store" className="nx-btn nx-btn--outline nx-btn--sm">
                  Browse store
                </Link>
              </div>
              <div className="nx-aside-card">
                <h3>Need the panic app?</h3>
                <p className="nx-muted">
                  Premium clients (homes, stores, work sites) get an invite code
                  from 4DS, then activate panic, tracking, and live cover in the
                  portal.
                </p>
                <div className="nx-section-cta">
                  <Link
                    href="/portal/register"
                    className="nx-btn nx-btn--outline nx-btn--sm"
                  >
                    Enter invite code
                  </Link>
                  <Link
                    href="/portal/login"
                    className="nx-btn nx-btn--ghost nx-btn--sm"
                  >
                    Portal login
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </>
    );
  }

  const current = plans?.current ?? subscription;

  return (
    <>
      <section className="nx-page-hero nx-page-hero--rich">
        <div className="nx-page-hero-inner">
          <p className="nx-eyebrow">Account</p>
          <h1>Welcome back, {profile?.firstName ?? session.user.firstName}</h1>
          <p>
            {isProtectionClient
              ? 'Manage your protection plan, services, and shop orders here — same client profile as the panic app, on the website.'
              : 'Store shop account — orders and contact details. Panic-app cover needs a separate invite from 4DS.'}
          </p>
        </div>
      </section>

      <section className="nx-section nx-account">
        {panel !== 'home' && (
          <button
            type="button"
            className="nx-btn nx-btn--ghost nx-btn--sm"
            style={{ marginBottom: '1rem' }}
            onClick={() => setPanel('home')}
          >
            ← Back to account
          </button>
        )}

        {panel === 'subscription' && isProtectionClient && (
          <div className="nx-account-dashboard">
            <div className="nx-account-card nx-account-card--wide">
              <h2>Manage subscription</h2>
              <p className="nx-muted">
                Billing and renewals stay on the Nexus website. Staff tools use a
                separate login.
              </p>
              {current ? (
                <dl className="nx-account-dl">
                  <div>
                    <dt>Plan</dt>
                    <dd>{current.planName ?? current.tierName}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{current.status.replace('_', ' ')}</dd>
                  </div>
                  <div>
                    <dt>Member ID</dt>
                    <dd>{current.memberId}</dd>
                  </div>
                  <div>
                    <dt>Valid until</dt>
                    <dd>{new Date(current.validUntil).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt>Monthly</dt>
                    <dd>
                      {current.amountDueFormatted ?? current.priceFormatted}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="nx-muted">No subscription loaded.</p>
              )}
              {profileError && <ErrorAlert error={profileError} />}
              <div className="nx-section-cta">
                <button
                  type="button"
                  className="nx-btn nx-btn--primary"
                  disabled={charging}
                  onClick={() => void payMonthly()}
                >
                  {charging ? 'Starting…' : 'Pay monthly'}
                </button>
                <button
                  type="button"
                  className="nx-btn nx-btn--outline"
                  onClick={() => setPanel('services')}
                >
                  View services
                </button>
              </div>
            </div>

            {loyalty && (
              <LoyaltySummaryCard
                loyalty={loyalty}
                variant="site"
                onUpdated={(next) => setLoyalty(next)}
              />
            )}

            <div className="nx-account-card nx-account-card--wide">
              <h2>Payment history</h2>
              {payments.length === 0 ? (
                <p className="nx-muted">No payments yet.</p>
              ) : (
                <ul className="nx-order-list">
                  {payments.map((pay) => (
                    <li key={pay.id}>
                      <div>
                        <strong>
                          {pay.kind === 'MONTHLY' ? 'Monthly' : 'Checkout'} ·{' '}
                          {pay.reference}
                        </strong>
                        <p className="nx-muted">
                          {new Date(pay.createdAt).toLocaleString()} ·{' '}
                          {pay.status}
                        </p>
                      </div>
                      <strong>{pay.amountFormatted}</strong>
                      <Link
                        href={`/account/receipt/${encodeURIComponent(pay.reference)}`}
                        className="nx-link-sm"
                        target="_blank"
                      >
                        View receipt
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {panel === 'services' && (
          <div className="nx-account-dashboard">
            <div className="nx-account-card nx-account-card--wide">
              <h2>Your services</h2>
              <p className="nx-muted">
                Cover you already have, plus add-ons and upgrades you can still
                subscribe to.
              </p>
              {!isProtectionClient || !plans ? (
                <p className="nx-muted">
                  No protection plan on this account yet.{' '}
                  <Link href="/contact">Request cover</Link> or browse{' '}
                  <Link href="/services">company services</Link>.
                </p>
              ) : (
                <>
                  <h3 className="nx-account-plan-name" style={{ fontSize: '1.2rem' }}>
                    Active on your plan
                  </h3>
                  <ul className="nx-check-list" style={{ marginBottom: '1.5rem' }}>
                    <li>
                      <strong>{plans.current.tierName}</strong> — base personal
                      protection &amp; emergency response
                    </li>
                    {plans.addons
                      .filter((a) => a.isActive)
                      .map((a) => (
                        <li key={a.code}>
                          <strong>{a.name}</strong> — {a.description} (
                          {a.priceFormatted})
                        </li>
                      ))}
                  </ul>

                  <h3 className="nx-account-plan-name" style={{ fontSize: '1.2rem' }}>
                    Available to add
                  </h3>
                  <div className="nx-service-grid">
                    {plans.tiers
                      .filter((t) => t.isAvailable && !t.isCurrent)
                      .map((t) => (
                        <article key={t.code} className="nx-service-card">
                          <h2>{t.name}</h2>
                          <p>{t.description}</p>
                          <p className="nx-muted">{t.priceFormatted}</p>
                          <button
                            type="button"
                            className="nx-btn nx-btn--primary nx-btn--sm"
                            disabled={upgrading === t.code}
                            onClick={() => void startUpgrade('tier', t.code)}
                          >
                            {upgrading === t.code ? 'Starting…' : 'Upgrade'}
                          </button>
                        </article>
                      ))}
                    {plans.addons
                      .filter((a) => a.isAvailable)
                      .map((a) => (
                        <article key={a.code} className="nx-service-card">
                          <h2>{a.name}</h2>
                          <p>{a.description}</p>
                          <p className="nx-muted">{a.priceFormatted}</p>
                          <button
                            type="button"
                            className="nx-btn nx-btn--outline nx-btn--sm"
                            disabled={upgrading === a.code}
                            onClick={() => void startUpgrade('addon', a.code)}
                          >
                            {upgrading === a.code ? 'Starting…' : 'Add to plan'}
                          </button>
                        </article>
                      ))}
                    {plans.tiers.every((t) => t.isCurrent || !t.isAvailable) &&
                      plans.addons.every((a) => !a.isAvailable) && (
                        <p className="nx-muted">
                          You already have the full available cover set for this
                          account.
                        </p>
                      )}
                  </div>
                  {profileError && <ErrorAlert error={profileError} />}
                </>
              )}
              <div className="nx-section-cta">
                <Link href="/services" className="nx-btn nx-btn--ghost nx-btn--sm">
                  Company services overview
                </Link>
              </div>
            </div>
          </div>
        )}

        {panel === 'home' && (
          <div className="nx-account-dashboard">
            <div className="nx-account-card">
              <h2>
                {isProtectionClient ? 'Client profile' : 'Store profile'}
              </h2>
              {!editingProfile ? (
                <>
                  <dl className="nx-account-dl">
                    <div>
                      <dt>Name</dt>
                      <dd>{fullName}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{profile?.email ?? session.user.email}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{profile?.phone || 'Not set'}</dd>
                    </div>
                    <div>
                      <dt>Account type</dt>
                      <dd>
                        {isProtectionClient
                          ? 'Protection client'
                          : 'Store shopper (guest / website account)'}
                      </dd>
                    </div>
                  </dl>
                  {profileMsg && <p className="nx-success">{profileMsg}</p>}
                  <div className="nx-section-cta">
                    {isProtectionClient && (
                      <button
                        type="button"
                        className="nx-btn nx-btn--primary"
                        onClick={openPortal}
                      >
                        {canUseClientSessionForPortal()
                          ? 'Open protection portal'
                          : 'Sign in to protection portal'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="nx-btn nx-btn--outline"
                      onClick={startEditProfile}
                    >
                      Edit profile
                    </button>
                    <button
                      type="button"
                      className="nx-btn nx-btn--ghost"
                      onClick={handleSignOut}
                    >
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <form className="nx-account-form" onSubmit={saveProfile}>
                  <label>
                    Phone
                    <input
                      type="tel"
                      value={phoneDraft}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                    />
                  </label>
                  {profileError && <ErrorAlert error={profileError} />}
                  <div className="nx-section-cta">
                    <button
                      type="submit"
                      className="nx-btn nx-btn--primary"
                      disabled={savingProfile}
                    >
                      {savingProfile ? 'Saving…' : 'Save profile'}
                    </button>
                    <button
                      type="button"
                      className="nx-btn nx-btn--ghost"
                      onClick={() => setEditingProfile(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="nx-account-card">
              <h2>Protection plan</h2>
              {isProtectionClient && subscription ? (
                <>
                  <p className="nx-account-plan-name">
                    {subscription.planName ?? subscription.tierName}
                  </p>
                  <p className="nx-muted">
                    Status: {subscription.status.replace('_', ' ')} · Member{' '}
                    {subscription.memberId}
                  </p>
                  <p className="nx-muted">
                    Valid until{' '}
                    {new Date(subscription.validUntil).toLocaleDateString()}
                    {subscription.priceFormatted
                      ? ` · ${subscription.priceFormatted}`
                      : ''}
                  </p>
                </>
              ) : (
                <p className="nx-muted">
                  No protection plan on this store profile yet. Request cover
                  when you are ready.
                </p>
              )}
              <div className="nx-section-cta">
                {isProtectionClient ? (
                  <>
                    <button
                      type="button"
                      className="nx-btn nx-btn--outline nx-btn--sm"
                      onClick={() => setPanel('subscription')}
                    >
                      Manage subscription
                    </button>
                    <button
                      type="button"
                      className="nx-btn nx-btn--ghost nx-btn--sm"
                      onClick={() => setPanel('services')}
                    >
                      View services
                    </button>
                  </>
                ) : (
                  <Link
                    href="/contact"
                    className="nx-btn nx-btn--outline nx-btn--sm"
                  >
                    Request protection
                  </Link>
                )}
              </div>
            </div>

            {loyalty && isProtectionClient && (
              <LoyaltySummaryCard
                loyalty={loyalty}
                variant="site"
                onUpdated={(next) => setLoyalty(next)}
              />
            )}

            <div className="nx-account-card nx-account-card--wide">
              <div className="nx-account-card-head">
                <h2>Shop orders</h2>
                <button
                  type="button"
                  className="nx-btn nx-btn--outline nx-btn--sm"
                  onClick={() => setDrawerOpen(true)}
                >
                  Cart ({cartCount})
                </button>
              </div>
              {ordersLoading ? (
                <LoadingSpinner label="Loading orders…" />
              ) : ordersError ? (
                <ErrorAlert error={ordersError} />
              ) : orders.length === 0 ? (
                <p className="nx-muted">
                  No store orders linked yet. Guest checkouts stay with the shop
                  — they do not open a protection account.
                </p>
              ) : (
                <ul className="nx-order-list">
                  {orders.map((o) => (
                    <li key={o.id}>
                      <div>
                        <strong>{o.orderNumber}</strong>
                        <p className="nx-muted">
                          {new Date(o.createdAt).toLocaleString()} · {o.status}
                        </p>
                        <p>
                          {o.items
                            .map((i) => `${i.quantity}× ${i.productName}`)
                            .join(', ')}
                        </p>
                      </div>
                      <strong>{o.totalFormatted}</strong>
                    </li>
                  ))}
                </ul>
              )}
              <div className="nx-section-cta">
                <button
                  type="button"
                  className="nx-btn nx-btn--primary nx-btn--sm"
                  onClick={() => router.push('/store')}
                >
                  Continue shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
