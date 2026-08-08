'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
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

export default function SubscriptionReceiptPage() {
  return (
    <PortalLayout>
      <ReceiptContent />
    </PortalLayout>
  );
}

function ReceiptContent() {
  const params = useParams();
  const reference = decodeURIComponent(String(params.id ?? ''));

  const { data, loading, error, reload } = useApi(
    () =>
      reference
        ? clientApi.get<ApiResponse<Payment>>(`/client/subscription/payment/${encodeURIComponent(reference)}`)
        : Promise.reject(new Error('Missing payment reference')),
    [reference],
  );

  useEffect(() => {
    document.body.classList.add('receipt-print-page');
    return () => document.body.classList.remove('receipt-print-page');
  }, []);

  if (!reference) {
    return <div className="alert alert--error">Invalid receipt.</div>;
  }
  if (loading) return <LoadingSpinner label="Loading receipt..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const payment = data!.data;

  return (
    <div className="page-content receipt-page">
      <div className="receipt-page__actions no-print">
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          Print receipt
        </button>
        <Link href="/portal/subscription" className="btn-secondary">
          Back to subscription
        </Link>
      </div>

      <article className="portal-card receipt-card">
        <header className="receipt-card__header">
          <BrandMark variant="portal" href={false} />
          <h1>4DS Nexus</h1>
          <p className="text-muted">Payment receipt</p>
        </header>
        <dl className="receipt-card__details">
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
            <dd>
              <span className="badge">{payment.status}</span>
            </dd>
          </div>
          <div>
            <dt>Provider</dt>
            <dd>{payment.provider}</dd>
          </div>
          {payment.kind && (
            <div>
              <dt>Type</dt>
              <dd>{payment.kind === 'MONTHLY' ? 'Monthly subscription' : 'Checkout'}</dd>
            </div>
          )}
          {payment.createdAt && (
            <div>
              <dt>Date</dt>
              <dd>{new Date(payment.createdAt).toLocaleString()}</dd>
            </div>
          )}
        </dl>
        <footer className="receipt-card__footer text-muted">
          Thank you for your payment.
        </footer>
      </article>

      <style jsx global>{`
        @media print {
          .no-print,
          nav,
          header,
          .portal-sidebar {
            display: none !important;
          }
          .receipt-card {
            box-shadow: none !important;
            border: 1px solid #ccc;
          }
        }
        .receipt-page__actions {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .receipt-card__header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .receipt-card__header h1 {
          margin: 0.5rem 0 0;
        }
        .receipt-card__details {
          display: grid;
          gap: 0.75rem;
          margin: 0;
        }
        .receipt-card__details div {
          display: grid;
          grid-template-columns: 8rem 1fr;
          gap: 0.5rem;
        }
        .receipt-card__details dt {
          margin: 0;
          color: var(--muted, #666);
          font-weight: 500;
        }
        .receipt-card__details dd {
          margin: 0;
        }
        .receipt-card__footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
