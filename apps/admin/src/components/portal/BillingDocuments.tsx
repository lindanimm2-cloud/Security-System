'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type BillingDocument = {
  id: string;
  title: string;
  type: 'INVOICE' | 'RECEIPT' | 'STATEMENT';
  reference: string;
  amountFormatted: string;
  periodLabel?: string;
  issuedAt: string;
  downloadUrl: string;
};

export function BillingDocuments() {
  const { data, loading } = useApi(
    () => clientApi.get<ApiResponse<BillingDocument[]>>('/client/billing/documents'),
    [],
  );

  const docs = data?.data ?? [];

  return (
    <section className="portal-card billing-documents" aria-label="Billing documents">
      <div className="card-header-row">
        <h2>Documents &amp; invoices</h2>
        <Link href="/portal/subscription" className="link-sm">
          Billing
        </Link>
      </div>
      <p className="text-muted">
        Download tax invoices, payment receipts, and monthly statements.
      </p>

      {loading ? (
        <LoadingSpinner label="Loading documents…" size="sm" />
      ) : docs.length === 0 ? (
        <p className="text-muted">No documents yet — they appear after your first payment.</p>
      ) : (
        <ul className="billing-doc-list">
          {docs.map((doc) => (
            <li key={doc.id} className="billing-doc-list__item">
              <div className="billing-doc-list__icon" aria-hidden>
                {doc.type === 'INVOICE' ? 'INV' : doc.type === 'RECEIPT' ? 'RCP' : 'STM'}
              </div>
              <div className="billing-doc-list__body">
                <strong>{doc.title}</strong>
                <span className="text-muted">
                  {doc.reference}
                  {doc.periodLabel ? ` · ${doc.periodLabel}` : ''} · {doc.amountFormatted} ·{' '}
                  {new Date(doc.issuedAt).toLocaleDateString()}
                </span>
              </div>
              <Link
                href={doc.downloadUrl}
                className="btn-sm btn-sm--link"
                target={doc.downloadUrl.startsWith('http') ? '_blank' : undefined}
              >
                Download
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
