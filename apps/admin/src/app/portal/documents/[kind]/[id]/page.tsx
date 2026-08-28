'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { BrandedDocumentFrame } from '@/components/documents/BrandedDocumentFrame';
import { PortalLayout } from '@/components/portal/PortalLayout';
import {
  billingDocToBrandedData,
  type BillingDocType,
} from '@/lib/billing-document-data';
import { downloadBrandedDocument, openBrandedDocument } from '@/lib/branded-document';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';

type BillingDocument = {
  id: string;
  title: string;
  type: BillingDocType;
  reference: string;
  amountFormatted: string;
  periodLabel?: string;
  issuedAt: string;
  downloadUrl: string;
};

const KIND_MAP: Record<string, BillingDocType> = {
  invoice: 'INVOICE',
  receipt: 'RECEIPT',
  statement: 'STATEMENT',
};

export default function PortalDocumentPage() {
  return (
    <PortalLayout>
      <DocumentContent />
    </PortalLayout>
  );
}

function DocumentContent() {
  const params = useParams();
  const kindParam = String(params.kind ?? '').toLowerCase();
  const id = decodeURIComponent(String(params.id ?? ''));
  const expectedType = KIND_MAP[kindParam];

  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<BillingDocument[]>>('/client/billing/documents'),
    [],
  );

  const doc = useMemo(() => {
    const list = data?.data ?? [];
    return (
      list.find(
        (item) =>
          (item.id === id || item.reference === id) &&
          (!expectedType || item.type === expectedType),
      ) ??
      list.find((item) => item.id === id || item.reference === id) ??
      null
    );
  }, [data, expectedType, id]);

  if (!id || !expectedType) {
    return <div className="alert alert--error">Invalid document link.</div>;
  }
  if (loading) return <LoadingSpinner label="Loading document…" fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  if (!doc) {
    return (
      <div className="page-content">
        <div className="alert alert--error">Document not found.</div>
        <Link href="/portal/billing" className="btn-secondary">
          Back to billing
        </Link>
      </div>
    );
  }

  const branded = billingDocToBrandedData(doc);

  return (
    <div className="page-content">
      <BrandedDocumentFrame
        data={branded}
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => openBrandedDocument(branded, { autoPrint: true })}>
              Print / Save as PDF
            </button>
            <button type="button" className="btn-secondary" onClick={() => downloadBrandedDocument(branded)}>
              Download template
            </button>
            <Link href="/portal/billing" className="btn-secondary">
              Back to billing
            </Link>
          </>
        }
      />
    </div>
  );
}
