'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BrandedDocumentFrame } from '@/components/documents/BrandedDocumentFrame';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { paymentToReceiptDoc, billingDocToBrandedData } from '@/lib/billing-document-data';
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

  if (!reference) {
    return <div className="alert alert--error">Invalid receipt.</div>;
  }
  if (loading) return <LoadingSpinner label="Loading receipt..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const payment = data!.data;
  const branded = billingDocToBrandedData(paymentToReceiptDoc(payment));

  return (
    <div className="page-content">
      <BrandedDocumentFrame
        data={branded}
        actions={
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={() => openBrandedDocument(branded, { autoPrint: true })}
            >
              Print / Save as PDF
            </button>
            <button type="button" className="btn-secondary" onClick={() => downloadBrandedDocument(branded)}>
              Download template
            </button>
            <Link href="/portal/subscription" className="btn-secondary">
              Back to subscription
            </Link>
          </>
        }
      />
    </div>
  );
}
