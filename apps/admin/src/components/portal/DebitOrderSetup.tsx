'use client';

import { FormEvent, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type DebitOrder = {
  status: 'NONE' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'FAILED';
  bankName?: string;
  accountLast4?: string;
  debitDay?: number;
  verifiedAt?: string | null;
  message?: string;
};

export function DebitOrderSetup() {
  const { data, reload } = useApi(
    () => clientApi.get<ApiResponse<DebitOrder>>('/client/billing/debit-order'),
    [],
  );
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [debitDay, setDebitDay] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const debit = data?.data;
  const active = debit?.status === 'ACTIVE';
  const pending = debit?.status === 'PENDING_VERIFICATION';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await clientApi.post('/client/billing/debit-order', {
        bankName,
        accountNumber,
        debitDay: Number(debitDay),
      });
      setBankName('');
      setAccountNumber('');
      void reload();
    } catch (err) {
      setError(friendlyErrorMessage(err, 'action'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="portal-card billing-debit" aria-label="Debit order">
      <div className="card-header-row">
        <h2>Debit order</h2>
        {active ? (
          <span className="status-pill status-pill--ok">Active</span>
        ) : pending ? (
          <span className="status-pill status-pill--acknowledged">Pending verification</span>
        ) : null}
      </div>
      <p className="text-muted">
        Set up a monthly debit order for your subscription. Control room verifies bank details before
        the first collection.
      </p>

      {active && debit ? (
        <ul className="status-list">
          <li className="status-list-item">
            <span className="status-list-link">Bank</span>
            <strong>{debit.bankName}</strong>
          </li>
          <li className="status-list-item">
            <span className="status-list-link">Account</span>
            <strong>•••• {debit.accountLast4}</strong>
          </li>
          <li className="status-list-item">
            <span className="status-list-link">Debit day</span>
            <strong>{debit.debitDay} of each month</strong>
          </li>
        </ul>
      ) : pending ? (
        <div className="alert alert--info">
          {debit?.message ??
            'Debit order submitted — control room is verifying your bank details. You can still pay by card in the meantime.'}
        </div>
      ) : (
        <form className="billing-debit__form" onSubmit={submit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Bank</span>
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. FNB, Standard Bank"
                required
              />
            </label>
            <label className="form-field">
              <span>Account number</span>
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Your account number"
                inputMode="numeric"
                required
              />
            </label>
            <label className="form-field">
              <span>Debit day</span>
              <select value={debitDay} onChange={(e) => setDebitDay(e.target.value)}>
                {[1, 5, 15, 25].map((d) => (
                  <option key={d} value={d}>
                    {d}
                    {d === 1 ? 'st' : d === 5 ? 'th' : d === 15 ? 'th' : 'th'} of month
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error ? <div className="alert alert--error">{error}</div> : null}
          <button type="submit" className="btn-secondary" disabled={busy}>
            {busy ? <LoadingSpinner label="" size="sm" /> : 'Submit debit order'}
          </button>
        </form>
      )}
    </section>
  );
}
