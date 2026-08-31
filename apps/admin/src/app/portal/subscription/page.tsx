'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  LoyaltySummaryCard,
  type LoyaltySummary,
} from '@/components/loyalty/LoyaltySummaryCard';
import { BillingDocuments } from '@/components/portal/BillingDocuments';
import { DebitOrderSetup } from '@/components/portal/DebitOrderSetup';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

type PlansData = {
  paymentProvider: { name: string; description: string; website: string };
  tiers: { code: string; name: string; priceFormatted: string; description: string; isCurrent: boolean; isAvailable: boolean }[];
  addons: { code: string; name: string; priceFormatted: string; description: string; isActive: boolean; isAvailable: boolean }[];
  availableUpgrades: {
    tier: { name: string; priceFormatted: string; description: string } | null;
    addons: { code: string; name: string; priceFormatted: string; description: string }[];
  };
  current: {
    tierName: string;
    tierCode: string;
    priceFormatted: string;
    memberId: string;
    status: string;
    validUntil: string;
    nextBillingAt?: string | null;
    lastPaidAt?: string | null;
    isOverdue?: boolean;
    daysPastDue?: number;
    amountDueFormatted?: string;
    billingFailedCount?: number;
    discountedMonthlyFormatted?: string;
    discountPercent?: number;
    discountCents?: number;
    loyalty?: LoyaltySummary;
    activeAddonDetails: { name: string; priceFormatted: string }[];
    access: Record<string, boolean>;
  };
};

type PaymentRow = {
  id: string;
  reference: string;
  amountFormatted: string;
  status: string;
  kind: string;
  createdAt: string;
};

export default function SubscriptionPage() {
  return (
    <PortalLayout>
      <SubscriptionContent />
    </PortalLayout>
  );
}

function SubscriptionContent() {
  const router = useRouter();
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [charging, setCharging] = useState(false);
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<PlansData>>('/client/plans'),
    [],
  );
  const { data: paymentsRes } = useApi(
    () => clientApi.get<ApiResponse<PaymentRow[]>>('/client/subscription/payments'),
    [],
  );

  async function checkout(type: 'tier' | 'addon', code: string) {
    setCheckingOut(code);
    try {
      const body = type === 'tier' ? { tierCode: code } : { addonCode: code };
      const res = await clientApi.post<ApiResponse<{ checkoutUrl: string }>>('/client/subscription/checkout', body);
      router.push(res.data.checkoutUrl);
    } finally {
      setCheckingOut(null);
    }
  }

  async function payMonthly() {
    setCharging(true);
    try {
      const res = await clientApi.post<ApiResponse<{ checkoutUrl: string }>>(
        '/client/subscription/charge-monthly',
        {},
      );
      router.push(res.data.checkoutUrl);
    } finally {
      setCharging(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading subscription..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const p = data?.data;
  const c = p?.current;
  const payments = paymentsRes?.data ?? [];

  if (!p || !c) {
    return (
      <ErrorAlert
        error="Subscription details are unavailable right now."
        onRetry={reload}
      />
    );
  }

  return (
    <div className="page-content page-content--wide">
      <div className="page-header">
        <div>
          <h1>Subscription & Billing</h1>
          <p className="text-muted">Manage your plan, add-ons, and payments via PayFast.</p>
        </div>
        <div className="btn-row">
          <Link href="/portal/subscription/upgrade" className="btn-primary">View upgrades</Link>
          <Link href="/portal/billing" className="btn-secondary">Billing &amp; documents</Link>
        </div>
      </div>

      {c.isOverdue && (
        <div className="alert alert--error" role="alert">
          Payment overdue{c.daysPastDue ? ` by ${c.daysPastDue} day(s)` : ''}. Amount due:{' '}
          <strong>{c.amountDueFormatted ?? c.priceFormatted}</strong>. Pay monthly to restore cover.
        </div>
      )}

      <Link href="/portal/profile" className="membership-card membership-card--link">
        <div className="membership-card-header">
          <BrandMark variant="portal" href={false} compact showProduct={false} />
          <span className={`status-pill status-pill--${c.status.toLowerCase()}`}>{c.status.replace('_', ' ')}</span>
        </div>
        <h2>{c.tierName}</h2>
        <div className="membership-card-details">
          <div><span className="text-muted">Member ID</span><strong>{c.memberId}</strong></div>
          <div><span className="text-muted">Valid Until</span><strong>{new Date(c.validUntil).toLocaleDateString()}</strong></div>
          <div>
            <span className="text-muted">Monthly</span>
            <strong>
              {c.discountedMonthlyFormatted ?? c.priceFormatted}
              {c.discountPercent ? (
                <span className="text-muted" style={{ fontWeight: 400 }}>
                  {' '}
                  ({c.discountPercent}% loyalty off)
                </span>
              ) : null}
            </strong>
          </div>
        </div>
        <div className="membership-card-bar" />
      </Link>

      {c.loyalty && (
        <LoyaltySummaryCard loyalty={c.loyalty} onUpdated={() => reload()} />
      )}

      <DebitOrderSetup />
      <BillingDocuments />

      <div className="portal-card">
        <div className="card-header-row">
          <h2>Payment &amp; billing</h2>
          <button type="button" className="btn-primary" onClick={() => void payMonthly()} disabled={charging}>
            {charging ? <LoadingSpinner label="" size="sm" /> : 'Pay monthly'}
          </button>
        </div>
        <p className="text-muted">
          Status: <strong>{c.status.replace('_', ' ')}</strong>
          {c.isOverdue ? ' · overdue' : ''} · Amount due:{' '}
          <strong>{c.amountDueFormatted ?? c.discountedMonthlyFormatted ?? c.priceFormatted}</strong>
          {c.discountPercent ? (
            <>
              {' '}
              <span>
                (list {c.priceFormatted}, {c.discountPercent}% loyalty discount applied at checkout)
              </span>
            </>
          ) : null}
        </p>
        <ul className="status-list">
          <li className="status-list-item">
            <span className="status-list-link">Next billing</span>
            <strong>
              {c.nextBillingAt ? new Date(c.nextBillingAt).toLocaleDateString() : new Date(c.validUntil).toLocaleDateString()}
            </strong>
          </li>
          <li className="status-list-item">
            <span className="status-list-link">Last paid</span>
            <strong>{c.lastPaidAt ? new Date(c.lastPaidAt).toLocaleDateString() : '—'}</strong>
          </li>
        </ul>
        <h3 className="section-title" style={{ marginTop: '1rem' }}>Payment history</h3>
        {payments.length === 0 ? (
          <p className="text-muted">No payments yet.</p>
        ) : (
          <ul className="status-list">
            {payments.map((pay) => (
              <li key={pay.id} className="status-list-item">
                <span className="status-list-link">
                  {pay.kind === 'MONTHLY' ? 'Monthly' : 'Checkout'} · {pay.reference}
                </span>
                <span>
                  {pay.amountFormatted}{' '}
                  <span className="badge">{pay.status}</span>{' '}
                  <span className="text-muted">{new Date(pay.createdAt).toLocaleDateString()}</span>{' '}
                  <Link
                    href={`/portal/subscription/receipt/${encodeURIComponent(pay.reference)}`}
                    className="btn-sm btn-sm--link"
                    target="_blank"
                  >
                    View receipt
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="portal-card payfast-card">
        <h2>PayFast — Recommended payment gateway</h2>
        <p className="text-muted">{p.paymentProvider.description}</p>
        <a href={p.paymentProvider.website} target="_blank" rel="noopener noreferrer" className="interactive-text">
          Learn more at payfast.co.za →
        </a>
      </div>

      <div className="tier-grid">
        {p.tiers.map((t) => (
          <div key={t.code} className={`tier-card ${t.isCurrent ? 'tier-card--current' : ''}`}>
            <div className="tier-card-header">
              <h3>{t.name}</h3>
              {t.isCurrent && <span className="feature-status">Current</span>}
            </div>
            <div className="tier-price">{t.priceFormatted}</div>
            <p>{t.description}</p>
            {t.isAvailable && !t.isCurrent && (
              <button type="button" className="btn-primary" onClick={() => checkout('tier', t.code)} disabled={!!checkingOut}>
                {checkingOut === t.code ? <LoadingSpinner label="" size="sm" /> : 'Upgrade'}
              </button>
            )}
          </div>
        ))}
      </div>

      <h2 className="section-title">Protection add-ons</h2>
      <div className="tier-grid">
        {p.addons.map((a) => (
          <div key={a.code} className={`tier-card ${a.isActive ? 'tier-card--current' : ''}`}>
            <div className="tier-card-header">
              <h3>{a.name}</h3>
              {a.isActive ? <span className="feature-status">Active</span> : <span className="feature-status feature-status--locked">Not included</span>}
            </div>
            <div className="tier-price">{a.priceFormatted}</div>
            <p>{a.description}</p>
            {a.isAvailable && (
              <button type="button" className="btn-secondary" onClick={() => checkout('addon', a.code)} disabled={!!checkingOut}>
                {checkingOut === a.code ? <LoadingSpinner label="" size="sm" /> : 'Add to plan'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="portal-card">
        <h2>Your active services</h2>
        <ul className="status-list">
          {Object.entries(c.access).map(([key, active]) => (
            <li key={key} className="status-list-item">
              <span className="status-list-link" style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
              <span className={`status-pill ${active ? 'status-pill--ok' : 'status-pill--alert'}`}>
                {active ? 'Included' : 'Upgrade'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
