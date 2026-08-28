'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ErrorAlert } from '@/components/ErrorAlert';
import { BrandedDocumentFrame } from '@/components/documents/BrandedDocumentFrame';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { billingDocToBrandedData, paymentToReceiptDoc } from '@/lib/billing-document-data';
import { downloadBrandedDocument, openBrandedDocument } from '@/lib/branded-document';

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
  const branded = billingDocToBrandedData(paymentToReceiptDoc(payment));

  return (
    <section className="nx-section">
      <BrandedDocumentFrame
        data={branded}
        actions={
          <>
            <button
              type="button"
              className="nx-btn nx-btn--primary nx-btn--sm"
              onClick={() => openBrandedDocument(branded, { autoPrint: true })}
            >
              Print / Save as PDF
            </button>
            <button
              type="button"
              className="nx-btn nx-btn--ghost nx-btn--sm"
              onClick={() => downloadBrandedDocument(branded)}
            >
              Download template
            </button>
            <Link href="/account" className="nx-btn nx-btn--ghost nx-btn--sm">
              Back to account
            </Link>
          </>
        }
      />
    </section>
  );
}
