'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

type Payment = {
  reference: string;
  provider: string;
  amountFormatted: string;
  status: string;
  description: string;
  kind?: string;
  createdAt?: string;
};

export default function AccountReceiptPage() {
  const params = useParams();
  const reference = decodeURIComponent(String(params.id ?? ''));

  const { data, loading, error, reload } = useApi(
    () =>
      reference
        ? clientApi.get<ApiResponse<Payment>>(
            `/client/subscription/payment/${encodeURIComponent(reference)}`,
          )
        : Promise.reject(new Error('Missing payment reference')),
    [reference],
  );

  useEffect(() => {
    document.body.classList.add('receipt-print-page');
    return () => document.body.classList.remove('receipt-print-page');
  }, []);

  if (!reference) {
    return (
      <section className="nx-section">
        <ErrorAlert error="Invalid receipt." />
      </section>
    );
  }

  if (loading) {
    return (
      <section className="nx-section">
        <LoadingSpinner label="Loading receipt…" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="nx-section">
        <ErrorAlert error={error} onRetry={reload} />
      </section>
    );
  }

  const payment = data!.data;

  return (
    <section className="nx-section nx-receipt">
      <div className="nx-receipt-actions no-print">
        <button
          type="button"
          className="nx-btn nx-btn--primary nx-btn--sm"
          onClick={() => window.print()}
        >
          Print receipt
        </button>
        <Link href="/account" className="nx-btn nx-btn--ghost nx-btn--sm">
          Back to account
        </Link>
      </div>

      <article className="nx-receipt-card">
        <header className="nx-receipt-header">
          <p className="nx-eyebrow">4DS Nexus</p>
          <h1>Payment receipt</h1>
        </header>
        <dl className="nx-receipt-dl">
          <div>
            <dt>Reference</dt>
            <dd>{payment.reference}</dd>
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
            <dt>Status</dt>
            <dd>{payment.status}</dd>
          </div>
          <div>
            <dt>Provider</dt>
            <dd>{payment.provider}</dd>
          </div>
          {payment.kind && (
            <div>
              <dt>Type</dt>
              <dd>
                {payment.kind === 'MONTHLY' ? 'Monthly subscription' : 'Checkout'}
              </dd>
            </div>
          )}
          {payment.createdAt && (
            <div>
              <dt>Date</dt>
              <dd>{new Date(payment.createdAt).toLocaleString()}</dd>
            </div>
          )}
        </dl>
        <p className="nx-muted nx-receipt-thanks">Thank you for your payment.</p>
      </article>
    </section>
  );
}
