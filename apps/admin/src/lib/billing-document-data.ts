import {
  demoClientBillTo,
  type BrandedDocumentData,
  type DocKind,
} from '@/lib/branded-document';
import { getCompanyProfile } from '@/lib/company-profile';

export type BillingDocType = 'INVOICE' | 'RECEIPT' | 'STATEMENT';

export type BillingDocInput = {
  id: string;
  title: string;
  type: BillingDocType;
  reference: string;
  amountFormatted: string;
  periodLabel?: string;
  issuedAt: string;
  description?: string;
  status?: string;
  provider?: string;
};

function moneyParts(totalFormatted: string): { subtotal: string; vat: string; total: string } {
  const numeric = Number(String(totalFormatted).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { subtotal: totalFormatted, vat: 'R0.00', total: totalFormatted };
  }
  const company = getCompanyProfile();
  if (!company.vatInclusive) {
    const vat = numeric * 0.15;
    const fmt = (n: number) =>
      `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return { subtotal: fmt(numeric), vat: fmt(vat), total: fmt(numeric + vat) };
  }
  const net = numeric / 1.15;
  const vat = numeric - net;
  const fmt = (n: number) =>
    `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return { subtotal: fmt(net), vat: fmt(vat), total: totalFormatted };
}

export function billingDocToBrandedData(doc: BillingDocInput): BrandedDocumentData {
  const company = getCompanyProfile();
  const parts = moneyParts(doc.amountFormatted);
  const kind = doc.type as DocKind;
  const serviceLabel =
    doc.description ||
    (doc.type === 'STATEMENT'
      ? `${company.plan} — ${doc.periodLabel || 'period summary'}`
      : `${company.plan} subscription`);

  const base: BrandedDocumentData = {
    kind,
    title: doc.title,
    reference: doc.reference,
    issuedAt: doc.issuedAt,
    periodLabel: doc.periodLabel,
    status: doc.status,
    billTo: demoClientBillTo(),
    total: parts.total,
    subtotal: parts.subtotal,
    vat: parts.vat,
    lines: [
      {
        description: serviceLabel,
        quantity: 1,
        unitPrice: parts.subtotal,
        amount: parts.subtotal,
      },
    ],
    notes: [
      company.vatNumber
        ? `VAT number ${company.vatNumber}. This document is generated from the ${company.tradingName} billing ledger.`
        : `This document is generated from the ${company.tradingName} billing ledger.`,
      company.supportPhone
        ? `Queries: ${company.supportPhone}${company.invoiceEmail ? ` · ${company.invoiceEmail}` : ''}`
        : 'Retain this document for your records.',
    ],
  };

  if (doc.type === 'RECEIPT') {
    base.meta = [
      { label: 'Payment ref', value: doc.reference },
      { label: 'Provider', value: doc.provider || 'PayFast' },
      { label: 'Status', value: doc.status || 'COMPLETE' },
      { label: 'Method', value: 'Card / EFT' },
    ];
    base.notes = [
      'This receipt confirms payment received. Thank you.',
      ...(base.notes ?? []),
    ];
  }

  if (doc.type === 'STATEMENT') {
    base.lines = [
      {
        description: `Opening balance — ${doc.periodLabel || 'period'}`,
        quantity: 1,
        unitPrice: 'R0.00',
        amount: 'R0.00',
      },
      {
        description: serviceLabel,
        quantity: 1,
        unitPrice: parts.subtotal,
        amount: parts.subtotal,
      },
      {
        description: 'Payment received',
        quantity: 1,
        unitPrice: `-${parts.total}`,
        amount: `-${parts.total}`,
      },
    ];
    base.subtotal = parts.total;
    base.vat = parts.vat;
    base.total = 'R0.00';
    base.notes = [
      `Statement for ${doc.periodLabel || 'the billing period'}. Closing balance is settled.`,
      ...(base.notes ?? []),
    ];
  }

  return base;
}

export function paymentToReceiptDoc(payment: {
  reference: string;
  provider: string;
  amountFormatted: string;
  status: string;
  description: string;
  kind?: string;
  createdAt?: string;
}): BillingDocInput {
  return {
    id: payment.reference,
    title: 'Payment receipt',
    type: 'RECEIPT',
    reference: payment.reference,
    amountFormatted: payment.amountFormatted,
    issuedAt: payment.createdAt || new Date().toISOString(),
    description:
      payment.description ||
      (payment.kind === 'MONTHLY' ? 'Monthly subscription' : 'Checkout payment'),
    status: payment.status,
    provider: payment.provider,
  };
}
