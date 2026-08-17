'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSiteClient } from '@/components/site/SiteClientProvider';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { useApi } from '@/hooks/useApi';

type Payment = {
  reference: string;
  provider: string;
  amountFormatted: string;
  status: string;
  description: string;
  kind?: string;
};

function SiteCheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const ref = params.get('ref') ?? '';
  const { session, ready } = useSiteClient();
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<'card' | 'eft'>('card');
  const { data, loading, error } = useApi(
    () =>
      ref
        ? clientApi.get<ApiResponse<Payment>>(
            `/client/subscription/payment/${ref}`,
          )
        : Promise.reject(new Error('Missing payment reference')),
    [ref, session?.accessToken],
  );

  if (!ready) return <LoadingSpinner label="Loading…" />;
  if (!session) {
    return (
      <section className="nx-section">
        <ErrorAlert error="Sign in to your website account to complete payment." />
        <Link href="/account" className="nx-btn nx-btn--primary">
          Go to account
        </Link>
      </section>
    );
  }
  if (!ref) {
    return (
      <section className="nx-section">
        <ErrorAlert error="Invalid checkout session." />
      </section>
    );
  }
  if (loading) {
    return (
      <section className="nx-section">
        <LoadingSpinner label="Loading checkout…" />
      </section>
    );
  }
  if (error) {
    return (
      <section className="nx-section">
        <ErrorAlert error={error} />
      </section>
    );
  }

  const payment = data!.data;
  const isMonthly = payment.kind === 'MONTHLY';

  if (payment.status === 'COMPLETE') {
    router.replace('/account?panel=subscription');
    return (
      <section className="nx-section">
        <LoadingSpinner label="Redirecting…" />
      </section>
    );
  }

  async function pay() {
    setPaying(true);
    try {
      await clientApi.post('/client/subscription/confirm', { reference: ref });
      router.push('/account');
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <section className="nx-page-hero nx-page-hero--rich">
        <div className="nx-page-hero-inner">
          <p className="nx-eyebrow">Checkout</p>
          <h1>PayFast payment</h1>
          <p>
            {isMonthly
              ? 'Monthly subscription renewal — stays on the Nexus website.'
              : 'Plan upgrade / add-on — complete payment on the website.'}
          </p>
        </div>
      </section>

      <section className="nx-section">
        <div className="nx-account-card" style={{ maxWidth: 520 }}>
          <dl className="nx-account-dl">
            <div>
              <dt>Type</dt>
              <dd>{isMonthly ? 'Monthly renewal' : 'Upgrade'}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{payment.description}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>
                <strong>{payment.amountFormatted}</strong>
              </dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{payment.reference}</dd>
            </div>
          </dl>

          <div className="nx-section-cta" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className={`nx-btn ${method === 'card' ? 'nx-btn--primary' : 'nx-btn--ghost'} nx-btn--sm`}
              onClick={() => setMethod('card')}
            >
              Card
            </button>
            <button
              type="button"
              className={`nx-btn ${method === 'eft' ? 'nx-btn--primary' : 'nx-btn--ghost'} nx-btn--sm`}
              onClick={() => setMethod('eft')}
            >
              EFT
            </button>
          </div>

          {method === 'card' && (
            <form
              className="nx-account-form"
              style={{ marginTop: '1rem' }}
              onSubmit={(e) => {
                e.preventDefault();
                void pay();
              }}
            >
              <label>
                Cardholder name
                <input placeholder="As on card" />
              </label>
              <label>
                Card number
                <input placeholder="4111 1111 1111 1111" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label>
                  Expiry
                  <input placeholder="MM/YY" />
                </label>
                <label>
                  CVV
                  <input placeholder="123" />
                </label>
              </div>
              <button
                type="submit"
                className="nx-btn nx-btn--primary nx-btn--block"
                disabled={paying}
              >
                {paying
                  ? 'Processing…'
                  : `Pay ${payment.amountFormatted} securely`}
              </button>
            </form>
          )}

          {method === 'eft' && (
            <div style={{ marginTop: '1rem' }}>
              <p className="nx-muted">
                Instant EFT via PayFast — you will be redirected to authorise payment.
              </p>
              <button
                type="button"
                className="nx-btn nx-btn--primary nx-btn--block"
                disabled={paying}
                onClick={() => void pay()}
              >
                {paying
                  ? 'Processing…'
                  : `Pay ${payment.amountFormatted} via EFT`}
              </button>
            </div>
          )}

          <p className="nx-muted nx-checkout-fineprint" style={{ marginTop: '1rem' }}>
            Secure checkout — no real charge in this environment.{' '}
            <Link href="/account">Cancel and return to account</Link>
          </p>
        </div>
      </section>
    </>
  );
}

export default function SiteCheckoutPage() {
  return (
    <Suspense
      fallback={
        <section className="nx-section">
          <LoadingSpinner label="Loading checkout…" />
        </section>
      }
    >
      <SiteCheckoutContent />
    </Suspense>
  );
}
