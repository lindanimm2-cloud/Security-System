'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UiSelect } from '@/components/ui/UiSelect';
import {
  ZA_ACCOUNT_TYPES,
  ZA_BANKS,
  ZA_DEBIT_DAYS,
  debitDayLabel,
  validateZaAccountNumber,
  validateZaBranchCode,
} from '@/lib/za-banks';

type DebitOrder = {
  status: 'NONE' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'FAILED';
  bankName?: string;
  accountLast4?: string;
  debitDay?: number;
  verifiedAt?: string | null;
  message?: string;
};

type FieldErrors = {
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  branchCode?: string;
};

export function DebitOrderSetup() {
  const { data, reload } = useApi(
    () => clientApi.get<ApiResponse<DebitOrder>>('/client/billing/debit-order'),
    [],
  );
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState('CHEQUE');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [debitDay, setDebitDay] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const debit = data?.data;
  const active = debit?.status === 'ACTIVE';
  const pending = debit?.status === 'PENDING_VERIFICATION';

  const bankOptions = useMemo(
    () => [
      { value: '', label: 'Select bank', disabled: true },
      ...ZA_BANKS.map((b) => ({
        value: b.name,
        label: b.name,
        meta: `Branch ${b.branchCode}`,
      })),
    ],
    [],
  );

  function markTouched(name: string) {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  function selectBank(name: string) {
    setBankName(name);
    const bank = ZA_BANKS.find((b) => b.name === name);
    if (bank) setBranchCode(bank.branchCode);
    setFieldErrors((prev) => ({ ...prev, bankName: name ? undefined : 'Select a South African bank.' }));
  }

  function validate(showAll = false): FieldErrors {
    const next: FieldErrors = {};
    if (!bankName) next.bankName = 'Select a South African bank.';
    if (!accountType) next.accountType = 'Select the account type.';
    const accountErr = validateZaAccountNumber(accountNumber);
    if (accountErr) next.accountNumber = accountErr;
    const branchErr = validateZaBranchCode(branchCode);
    if (branchErr) next.branchCode = branchErr;
    if (showAll) setTouched({ bankName: true, accountType: true, accountNumber: true, branchCode: true });
    setFieldErrors(next);
    return next;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = validate(true);
    if (Object.keys(next).length > 0) {
      setError('Check the highlighted fields before submitting.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await clientApi.post('/client/billing/debit-order', {
        bankName,
        accountType,
        accountNumber: accountNumber.replace(/[\s-]/g, ''),
        branchCode: branchCode.replace(/\s/g, ''),
        debitDay: Number(debitDay),
      });
      setBankName('');
      setAccountNumber('');
      setBranchCode('');
      setAccountType('CHEQUE');
      setFieldErrors({});
      setTouched({});
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
            <strong>{debit.debitDay ? debitDayLabel(debit.debitDay) : '—'}</strong>
          </li>
        </ul>
      ) : pending ? (
        <div className="alert alert--info">
          {debit?.message ??
            'Debit order submitted — control room is verifying your bank details. You can still pay by card in the meantime.'}
        </div>
      ) : (
        <form className="billing-debit__form" onSubmit={submit} noValidate>
          <div className="form-grid">
            <label className={`form-field ${touched.bankName && fieldErrors.bankName ? 'form-field--error' : ''}`}>
              <span>Bank</span>
              <UiSelect
                value={bankName}
                onChange={selectBank}
                options={bankOptions}
                ariaLabel="South African bank"
                compact={false}
                className="ui-select--field"
              />
              {touched.bankName && fieldErrors.bankName ? (
                <em className="form-field__error">{fieldErrors.bankName}</em>
              ) : (
                <em className="form-field__hint">South African banks only</em>
              )}
            </label>
            <label className={`form-field ${touched.accountType && fieldErrors.accountType ? 'form-field--error' : ''}`}>
              <span>Account type</span>
              <UiSelect
                value={accountType}
                onChange={(value) => {
                  setAccountType(value);
                  setFieldErrors((prev) => ({ ...prev, accountType: undefined }));
                }}
                options={ZA_ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                ariaLabel="Account type"
                compact={false}
                className="ui-select--field"
              />
            </label>
            <label className={`form-field ${touched.accountNumber && fieldErrors.accountNumber ? 'form-field--error' : ''}`}>
              <span>Account number</span>
              <input
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value);
                  if (touched.accountNumber) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      accountNumber: validateZaAccountNumber(e.target.value) || undefined,
                    }));
                  }
                }}
                onBlur={() => {
                  markTouched('accountNumber');
                  setFieldErrors((prev) => ({
                    ...prev,
                    accountNumber: validateZaAccountNumber(accountNumber) || undefined,
                  }));
                }}
                placeholder="7–13 digit account number"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={touched.accountNumber && !!fieldErrors.accountNumber}
              />
              {touched.accountNumber && fieldErrors.accountNumber ? (
                <em className="form-field__error">{fieldErrors.accountNumber}</em>
              ) : (
                <em className="form-field__hint">Bank account — not a card number</em>
              )}
            </label>
            <label className={`form-field ${touched.branchCode && fieldErrors.branchCode ? 'form-field--error' : ''}`}>
              <span>Branch code</span>
              <input
                value={branchCode}
                onChange={(e) => {
                  setBranchCode(e.target.value);
                  if (touched.branchCode) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      branchCode: validateZaBranchCode(e.target.value) || undefined,
                    }));
                  }
                }}
                onBlur={() => {
                  markTouched('branchCode');
                  setFieldErrors((prev) => ({
                    ...prev,
                    branchCode: validateZaBranchCode(branchCode) || undefined,
                  }));
                }}
                placeholder="6-digit universal branch"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={touched.branchCode && !!fieldErrors.branchCode}
              />
              {touched.branchCode && fieldErrors.branchCode ? (
                <em className="form-field__error">{fieldErrors.branchCode}</em>
              ) : (
                <em className="form-field__hint">Filled from your bank — edit if needed</em>
              )}
            </label>
            <label className="form-field">
              <span>Debit day</span>
              <UiSelect
                value={debitDay}
                onChange={setDebitDay}
                options={ZA_DEBIT_DAYS.map((d) => ({
                  value: String(d),
                  label: debitDayLabel(d),
                }))}
                ariaLabel="Debit day"
                compact={false}
                className="ui-select--field"
              />
            </label>
          </div>
          {error ? <div className="alert alert--error">{error}</div> : null}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <LoadingSpinner label="" size="sm" /> : 'Submit debit order'}
          </button>
        </form>
      )}
    </section>
  );
}
