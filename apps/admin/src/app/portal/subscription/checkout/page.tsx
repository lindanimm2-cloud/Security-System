'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
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
};

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const ref = params.get('ref') ?? '';
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<'card' | 'eft' | 'debit_order'>('card');
  const { data, loading, error , reload } = useApi(
    () => (ref ? clientApi.get<ApiResponse<Payment>>(`/client/subscription/payment/${ref}`) : Promise.reject(new Error('Missing payment reference'))),
    [ref],
  );

  if (!ref) return <div className="alert alert--error">Invalid checkout session.</div>;
  if (loading) return <LoadingSpinner label="Loading checkout..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const payment = data!.data;
  const isMonthly = payment.kind === 'MONTHLY';

  if (payment.status === 'COMPLETE') {
    router.push('/portal/subscription');
    return <LoadingSpinner label="Redirecting..." fullScreen />;
  }

  async function pay() {
    setPaying(true);
    try {
      await clientApi.post('/client/subscription/confirm', { reference: ref, method });
      if (method === 'debit_order') {
        router.push('/portal/billing?debitPending=1');
        return;
      }
      router.push(isMonthly ? '/portal/subscription?renewed=1' : '/portal/subscription?upgraded=1');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="page-content">
      <div className="checkout-card">
        <div className="checkout-header">
          <BrandMark variant="portal" href={false} compact showProduct={false} />
          <div>
            <h1>PayFast Checkout</h1>
            <p className="text-muted">
              {isMonthly ? 'Monthly subscription renewal' : 'Plan upgrade / add-on'}
            </p>
          </div>
        </div>

        <div className="checkout-summary">
          <div>
            <span className="text-muted">Type</span>
            <strong>{isMonthly ? 'Monthly renewal' : 'Upgrade'}</strong>
          </div>
          <div><span className="text-muted">Description</span><strong>{payment.description}</strong></div>
          <div><span className="text-muted">Amount</span><strong className="checkout-amount">{payment.amountFormatted}</strong></div>
          <div><span className="text-muted">Reference</span><strong>{payment.reference}</strong></div>
        </div>

        <div className="checkout-methods">
          <button type="button" className={`checkout-method ${method === 'card' ? 'checkout-method--active' : ''}`} onClick={() => setMethod('card')}>Card</button>
          <button type="button" className={`checkout-method ${method === 'eft' ? 'checkout-method--active' : ''}`} onClick={() => setMethod('eft')}>EFT</button>
          <button type="button" className={`checkout-method ${method === 'debit_order' ? 'checkout-method--active' : ''}`} onClick={() => setMethod('debit_order')}>Debit order</button>
        </div>

        {method === 'card' && (
          <div className="form-grid checkout-form">
            <label className="form-field form-field--full"><span>Cardholder name</span><input placeholder="As on card" /></label>
            <label className="form-field form-field--full"><span>Card number</span><input placeholder="4111 1111 1111 1111" /></label>
            <label className="form-field"><span>Expiry</span><input placeholder="MM/YY" /></label>
            <label className="form-field"><span>CVV</span><input placeholder="123" /></label>
          </div>
        )}

        {method === 'eft' && (
          <p className="text-muted checkout-eft-note">You will be redirected to your bank to authorise an instant EFT payment via PayFast.</p>
        )}

        {method === 'debit_order' && (
          <div className="checkout-debit-note">
            <p className="text-muted">
              Pay via monthly debit order. Submit your bank details on the{' '}
              <Link href="/portal/billing" className="interactive-text">billing page</Link>{' '}
              if you have not already. Control room verifies before the first collection.
            </p>
            <p className="text-muted">This checkout will mark the payment as pending verification.</p>
          </div>
        )}

        <button type="button" className="btn-primary btn-payfast" onClick={() => void pay()} disabled={paying}>
          {paying ? (
            <LoadingSpinner label="" size="sm" />
          ) : method === 'debit_order' ? (
            'Submit debit order payment'
          ) : (
            `Pay ${payment.amountFormatted} securely`
          )}
        </button>

        <p className="text-muted checkout-footer">
          Demo mode — no real charge. Production uses PayFast ITN webhooks.
          {' '}
          <Link href="/portal/subscription" className="interactive-text">Cancel</Link>
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <PortalLayout>
      <Suspense fallback={<LoadingSpinner label="Loading..." fullScreen />}>
        <CheckoutContent />
      </Suspense>
    </PortalLayout>
  );
}
