'use client';

import { useEffect } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { getCompanyProfile } from '@/lib/company-profile';
import type { BrandedDocumentData } from '@/lib/branded-document';

const KIND_LABEL: Record<BrandedDocumentData['kind'], string> = {
  INVOICE: 'Tax invoice',
  RECEIPT: 'Payment receipt',
  STATEMENT: 'Account statement',
  AUDIT: 'Audit log export',
  REPORT: 'Operations report',
};

export function BrandedDocumentFrame({
  data,
  actions,
}: {
  data: BrandedDocumentData;
  actions?: React.ReactNode;
}) {
  const company = getCompanyProfile();

  useEffect(() => {
    document.body.classList.add('branded-doc-page');
    return () => document.body.classList.remove('branded-doc-page');
  }, []);

  return (
    <div className="branded-doc">
      {actions ? <div className="branded-doc__actions no-print">{actions}</div> : null}

      <article className="branded-doc__sheet">
        <header className="branded-doc__letterhead">
          <div className="branded-doc__brand">
            <BrandMark variant="portal" href={false} showProduct={false} compact />
            <div>
              <strong>{company.legalName}</strong>
              <p className="text-muted">Trading as {company.tradingName}</p>
            </div>
          </div>
          <div className="branded-doc__org">
            {company.registration ? (
              <div>
                <span>Reg</span>
                <strong>{company.registration}</strong>
              </div>
            ) : null}
            {company.vatNumber ? (
              <div>
                <span>VAT</span>
                <strong>{company.vatNumber}</strong>
              </div>
            ) : null}
            {company.address ? (
              <div>
                <span>Address</span>
                <strong>{company.address}</strong>
              </div>
            ) : null}
            {company.supportPhone ? (
              <div>
                <span>Support</span>
                <strong>{company.supportPhone}</strong>
              </div>
            ) : null}
            {company.invoiceEmail ? (
              <div>
                <span>Accounts</span>
                <strong>{company.invoiceEmail}</strong>
              </div>
            ) : null}
          </div>
        </header>

        <div className="branded-doc__title-row">
          <div>
            <p className="branded-doc__kicker">{KIND_LABEL[data.kind]}</p>
            <h1>{data.title}</h1>
          </div>
          <div className="branded-doc__ref">
            <span>Reference</span>
            <strong>{data.reference}</strong>
            <span>Issued {new Date(data.issuedAt).toLocaleString()}</span>
            {data.periodLabel ? <span>Period {data.periodLabel}</span> : null}
            {data.status ? <span>Status {data.status}</span> : null}
          </div>
        </div>

        {data.billTo ? (
          <div className="branded-doc__parties">
            <div className="branded-doc__card">
              <h2>Bill to</h2>
              <p>
                <strong>{data.billTo.name}</strong>
              </p>
              {data.billTo.email ? <p>{data.billTo.email}</p> : null}
              {data.billTo.phone ? <p>{data.billTo.phone}</p> : null}
              {data.billTo.address ? <p>{data.billTo.address}</p> : null}
            </div>
            <div className="branded-doc__card">
              <h2>Document</h2>
              <p>{KIND_LABEL[data.kind]}</p>
              <p>{company.vatInclusive ? 'Amounts include VAT' : 'Amounts exclude VAT'}</p>
              <p>{company.plan}</p>
            </div>
          </div>
        ) : null}

        {data.meta?.length ? (
          <dl className="branded-doc__meta">
            {data.meta.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {data.lines?.length ? (
          <table className="branded-doc__table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((line) => (
                <tr key={`${line.description}-${line.amount}`}>
                  <td>{line.description}</td>
                  <td className="branded-doc__num">{line.quantity ?? 1}</td>
                  <td className="branded-doc__num">{line.unitPrice ?? line.amount}</td>
                  <td className="branded-doc__num">{line.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {data.table ? (
          <table className="branded-doc__table branded-doc__table--dense">
            <thead>
              <tr>
                {data.table.headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.table.rows.map((row, index) => (
                <tr key={`row-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`cell-${index}-${cellIndex}`}>{cell ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <div className="branded-doc__totals">
          {data.subtotal ? (
            <div>
              <span>Subtotal</span>
              <strong>{data.subtotal}</strong>
            </div>
          ) : null}
          {data.vat ? (
            <div>
              <span>VAT</span>
              <strong>{data.vat}</strong>
            </div>
          ) : null}
          <div className="branded-doc__total">
            <span>Total</span>
            <strong>{data.total}</strong>
          </div>
        </div>

        {data.notes?.length ? (
          <ul className="branded-doc__notes">
            {data.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}

        <footer className="branded-doc__footer">
          <span>
            Generated by {company.tradingName} · {company.legalName}
          </span>
          <span>
            {KIND_LABEL[data.kind]} {data.reference}
          </span>
        </footer>
      </article>
    </div>
  );
}
