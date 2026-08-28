'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { billingDocToBrandedData } from '@/lib/billing-document-data';
import { downloadBrandedDocument, openBrandedDocument } from '@/lib/branded-document';

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
        Branded tax invoices, payment receipts, and monthly statements with company letterhead.
      </p>

      {loading ? (
        <LoadingSpinner label="Loading documents…" size="sm" />
      ) : docs.length === 0 ? (
        <p className="text-muted">No documents yet — they appear after your first payment.</p>
      ) : (
        <ul className="billing-doc-list">
          {docs.map((doc) => {
            const branded = billingDocToBrandedData(doc);
            return (
              <li key={doc.id} className="billing-doc-list__item">
                <span className={`billing-doc-list__type billing-doc-list__type--${doc.type.toLowerCase()}`}>
                  {doc.type === 'INVOICE' ? 'INV' : doc.type === 'RECEIPT' ? 'RCP' : 'STM'}
                </span>
                <div className="billing-doc-list__body">
                  <strong>{doc.title}</strong>
                  <p className="billing-doc-list__meta">
                    <span>{doc.reference}</span>
                    {doc.periodLabel ? <span>{doc.periodLabel}</span> : null}
                    <span>{doc.amountFormatted}</span>
                    <span>{new Date(doc.issuedAt).toLocaleDateString()}</span>
                  </p>
                </div>
                <div className="billing-doc-list__actions">
                  <Link href={doc.downloadUrl} className="btn-secondary btn-sm">
                    Open
                  </Link>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => openBrandedDocument(branded, { autoPrint: true })}
                  >
                    Print PDF
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => downloadBrandedDocument(branded)}
                  >
                    Download
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
