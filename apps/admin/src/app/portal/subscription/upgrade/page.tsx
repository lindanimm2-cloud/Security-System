'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

type PlansData = {
  availableUpgrades: {
    tier: { name: string; priceFormatted: string; description: string } | null;
    addons: { code: string; name: string; priceFormatted: string; description: string }[];
  };
  current: { tierName: string; priceFormatted: string };
};

function UpgradeContent() {
  const router = useRouter();
  const params = useSearchParams();
  const preselect = params.get('addon');
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const { data, loading, error , reload } = useApi(
    () => clientApi.get<ApiResponse<PlansData>>('/client/plans'),
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

  if (loading) return <LoadingSpinner label="Loading upgrades..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const p = data!.data;
  const upgrades = p.availableUpgrades;

  return (
    <div className="page-content page-content--wide">
      <div className="page-header">
        <div>
          <h1>Upgrade your protection</h1>
          <p className="text-muted">
            Current plan: <strong>{p.current.tierName}</strong> at {p.current.priceFormatted}.
            {' '}
            <Link href="/portal/subscription" className="interactive-text">View subscription</Link>
          </p>
        </div>
      </div>

      {upgrades.tier && (
        <section className="portal-card portal-card--accent">
          <h2>Go Premium — everything included</h2>
          <p>{upgrades.tier.description}</p>
          <div className="tier-price">{upgrades.tier.priceFormatted}</div>
          <button type="button" className="btn-primary" onClick={() => checkout('tier', 'PREMIUM')} disabled={!!checkingOut}>
            {checkingOut === 'PREMIUM' ? <LoadingSpinner label="" size="sm" /> : 'Upgrade to Premium'}
          </button>
        </section>
      )}

      <section className="upgrade-section">
        <h2 className="section-title">Available add-ons</h2>
        {upgrades.addons.length === 0 ? (
          <p className="section-lead text-muted">
            You have all available add-ons, or you are on Premium.
          </p>
        ) : (
          <div className="tier-grid">
            {upgrades.addons.map((a) => (
              <div key={a.code} className={`tier-card ${preselect === a.code ? 'tier-card--highlight' : ''}`}>
                <h3>{a.name}</h3>
                <div className="tier-price">{a.priceFormatted}</div>
                <p>{a.description}</p>
                <button type="button" className="btn-primary" onClick={() => checkout('addon', a.code)} disabled={!!checkingOut}>
                  {checkingOut === a.code ? <LoadingSpinner label="" size="sm" /> : 'Add via PayFast'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="portal-card payfast-card">
        <h3>Secure checkout with PayFast</h3>
        <p className="text-muted">
          PCI-DSS compliant · Card, debit card, EFT &amp; instant EFT · Trusted across South Africa
        </p>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <PortalLayout>
      <Suspense fallback={<LoadingSpinner label="Loading..." fullScreen />}>
        <UpgradeContent />
      </Suspense>
    </PortalLayout>
  );
}
