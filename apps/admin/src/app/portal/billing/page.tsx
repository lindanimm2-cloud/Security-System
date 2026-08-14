'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { BillingDocuments } from '@/components/portal/BillingDocuments';
import { DebitOrderSetup } from '@/components/portal/DebitOrderSetup';

function BillingContent() {
  const params = useSearchParams();
  const debitPending = params.get('debitPending') === '1';

  return (
    <div className="page-content page-content--wide">
      <div className="page-header">
        <div>
          <h1>Billing &amp; documents</h1>
          <p className="text-muted">
            Pay in-app, set up a debit order, and download invoices and receipts.
          </p>
        </div>
        <Link href="/portal/subscription" className="btn-primary">
          Manage subscription
        </Link>
      </div>

      {debitPending && (
        <div className="alert alert--info">
          Debit order payment submitted — control room will verify before the first collection.
        </div>
      )}

      <DebitOrderSetup />
      <BillingDocuments />
    </div>
  );
}

export default function BillingPage() {
  return (
    <PortalLayout>
      <Suspense fallback={null}>
        <BillingContent />
      </Suspense>
    </PortalLayout>
  );
}
