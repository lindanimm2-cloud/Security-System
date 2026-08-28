import {
  companyAbsoluteLogoUrl,
  getCompanyProfile,
  type CompanyProfile,
} from '@/lib/company-profile';

export type DocKind = 'INVOICE' | 'RECEIPT' | 'STATEMENT' | 'AUDIT' | 'REPORT';

export type DocLineItem = {
  description: string;
  quantity?: number | string;
  unitPrice?: string;
  amount: string;
};

export type BrandedDocumentData = {
  kind: DocKind;
  title: string;
  reference: string;
  issuedAt: string;
  periodLabel?: string;
  status?: string;
  billTo?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  lines?: DocLineItem[];
  subtotal?: string;
  vat?: string;
  total: string;
  notes?: string[];
  meta?: { label: string; value: string }[];
  table?: {
    headers: string[];
    rows: (string | number | null)[][];
  };
};

const KIND_LABEL: Record<DocKind, string> = {
  INVOICE: 'Tax invoice',
  RECEIPT: 'Payment receipt',
  STATEMENT: 'Account statement',
  AUDIT: 'Audit log export',
  REPORT: 'Operations report',
};

function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatIssued(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function letterhead(company: CompanyProfile, logoUrl: string): string {
  return `
    <header class="bd-letterhead">
      <div class="bd-letterhead__brand">
        <img class="bd-logo" src="${esc(logoUrl)}" alt="${esc(company.legalName)}" />
        <div>
          <strong class="bd-company">${esc(company.legalName)}</strong>
          <p class="bd-trading">Trading as ${esc(company.tradingName)}</p>
        </div>
      </div>
      <div class="bd-letterhead__meta">
        ${company.registration ? `<div><span>Reg</span><strong>${esc(company.registration)}</strong></div>` : ''}
        ${company.vatNumber ? `<div><span>VAT</span><strong>${esc(company.vatNumber)}</strong></div>` : ''}
        ${company.address ? `<div><span>Address</span><strong>${esc(company.address)}</strong></div>` : ''}
        ${company.supportPhone ? `<div><span>Support</span><strong>${esc(company.supportPhone)}</strong></div>` : ''}
        ${company.invoiceEmail ? `<div><span>Accounts</span><strong>${esc(company.invoiceEmail)}</strong></div>` : ''}
      </div>
    </header>
  `;
}

function linesTable(lines: DocLineItem[]): string {
  const rows = lines
    .map(
      (line) => `
      <tr>
        <td>${esc(line.description)}</td>
        <td class="bd-num">${esc(line.quantity ?? '1')}</td>
        <td class="bd-num">${esc(line.unitPrice ?? line.amount)}</td>
        <td class="bd-num">${esc(line.amount)}</td>
      </tr>`,
    )
    .join('');
  return `
    <table class="bd-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function dataTable(headers: string[], rows: (string | number | null)[][]): string {
  return `
    <table class="bd-table bd-table--dense">
      <thead>
        <tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`)
          .join('')}
      </tbody>
    </table>
  `;
}

export function buildBrandedDocumentHtml(data: BrandedDocumentData, options?: { autoPrint?: boolean }): string {
  const company = getCompanyProfile();
  const logoUrl = companyAbsoluteLogoUrl();
  const kindLabel = KIND_LABEL[data.kind];
  const issued = formatIssued(data.issuedAt);
  const lines = data.lines?.length ? linesTable(data.lines) : '';
  const table = data.table ? dataTable(data.table.headers, data.table.rows) : '';
  const meta =
    data.meta?.length
      ? `<dl class="bd-meta">${data.meta
          .map(
            (item) => `<div><dt>${esc(item.label)}</dt><dd>${esc(item.value)}</dd></div>`,
          )
          .join('')}</dl>`
      : '';
  const notes =
    data.notes?.length
      ? `<ul class="bd-notes">${data.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(kindLabel)} · ${esc(data.reference)}</title>
  <style>
    :root {
      --ink: #111827;
      --muted: #6b7280;
      --line: #e5e7eb;
      --accent: #c9302c;
      --paper: #ffffff;
      --soft: #f8fafc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      color: var(--ink);
      background: #edf0f4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .bd-toolbar {
      position: sticky;
      top: 0;
      z-index: 5;
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      padding: 0.75rem 1rem;
      background: #0f1115;
      color: #fff;
    }
    .bd-toolbar button, .bd-toolbar a {
      appearance: none;
      border: 0;
      border-radius: 8px;
      padding: 0.55rem 0.9rem;
      font: inherit;
      font-weight: 650;
      cursor: pointer;
      text-decoration: none;
      color: #fff;
      background: var(--accent);
    }
    .bd-toolbar a.secondary, .bd-toolbar button.secondary {
      background: #2a2f38;
    }
    .bd-sheet {
      width: min(900px, calc(100% - 2rem));
      margin: 1.25rem auto 2rem;
      padding: 1.75rem 1.6rem 1.4rem;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 14px;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
    }
    .bd-letterhead {
      display: flex;
      justify-content: space-between;
      gap: 1.25rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid var(--accent);
      margin-bottom: 1.15rem;
    }
    .bd-letterhead__brand {
      display: flex;
      gap: 0.85rem;
      align-items: center;
      min-width: 0;
    }
    .bd-logo {
      width: 148px;
      height: auto;
      object-fit: contain;
    }
    .bd-company {
      display: block;
      font-size: 1.15rem;
      letter-spacing: 0.01em;
    }
    .bd-trading {
      margin: 0.15rem 0 0;
      color: var(--muted);
      font-size: 0.86rem;
    }
    .bd-letterhead__meta {
      display: grid;
      gap: 0.28rem;
      text-align: right;
      font-size: 0.78rem;
      color: var(--muted);
      min-width: 13rem;
    }
    .bd-letterhead__meta span {
      display: inline-block;
      min-width: 4.2rem;
      margin-right: 0.35rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.66rem;
    }
    .bd-letterhead__meta strong {
      color: var(--ink);
      font-weight: 650;
    }
    .bd-title-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .bd-kicker {
      margin: 0;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
      font-weight: 800;
    }
    .bd-title-row h1 {
      margin: 0.2rem 0 0;
      font-size: 1.55rem;
    }
    .bd-ref {
      text-align: right;
      font-size: 0.86rem;
      color: var(--muted);
    }
    .bd-ref strong {
      display: block;
      color: var(--ink);
      font-size: 1rem;
      margin-top: 0.15rem;
    }
    .bd-parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
      margin-bottom: 1rem;
    }
    .bd-card {
      background: var(--soft);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 0.85rem 0.95rem;
    }
    .bd-card h2 {
      margin: 0 0 0.45rem;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .bd-card p { margin: 0.15rem 0; font-size: 0.9rem; }
    .bd-meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.55rem 1rem;
      margin: 0 0 1rem;
    }
    .bd-meta div {
      display: grid;
      grid-template-columns: 7.5rem 1fr;
      gap: 0.35rem;
      padding: 0.35rem 0;
      border-bottom: 1px solid var(--line);
    }
    .bd-meta dt { margin: 0; color: var(--muted); font-size: 0.82rem; }
    .bd-meta dd { margin: 0; font-weight: 600; }
    .bd-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.35rem 0 1rem;
      font-size: 0.9rem;
    }
    .bd-table th, .bd-table td {
      border-bottom: 1px solid var(--line);
      padding: 0.65rem 0.45rem;
      text-align: left;
      vertical-align: top;
    }
    .bd-table th {
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
      background: var(--soft);
    }
    .bd-table--dense th, .bd-table--dense td {
      font-size: 0.8rem;
      padding: 0.45rem 0.35rem;
    }
    .bd-num { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .bd-totals {
      margin-left: auto;
      width: min(280px, 100%);
      display: grid;
      gap: 0.35rem;
      margin-bottom: 1rem;
    }
    .bd-totals div {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      font-size: 0.9rem;
    }
    .bd-totals .bd-total {
      margin-top: 0.25rem;
      padding-top: 0.45rem;
      border-top: 2px solid var(--ink);
      font-size: 1.05rem;
      font-weight: 800;
    }
    .bd-notes {
      margin: 0;
      padding-left: 1.1rem;
      color: var(--muted);
      font-size: 0.84rem;
    }
    .bd-footer {
      margin-top: 1.4rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      color: var(--muted);
      font-size: 0.75rem;
    }
    @media (max-width: 720px) {
      .bd-letterhead, .bd-title-row, .bd-parties, .bd-meta, .bd-footer { grid-template-columns: 1fr; display: grid; }
      .bd-letterhead__meta, .bd-ref { text-align: left; }
    }
    @media print {
      body { background: #fff; }
      .bd-toolbar { display: none !important; }
      .bd-sheet {
        width: 100%;
        margin: 0;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="bd-toolbar">
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
    <button type="button" class="secondary" onclick="window.close()">Close</button>
  </div>
  <article class="bd-sheet">
    ${letterhead(company, logoUrl)}
    <div class="bd-title-row">
      <div>
        <p class="bd-kicker">${esc(kindLabel)}</p>
        <h1>${esc(data.title)}</h1>
      </div>
      <div class="bd-ref">
        Reference
        <strong>${esc(data.reference)}</strong>
        <div>Issued ${esc(issued)}</div>
        ${data.periodLabel ? `<div>Period ${esc(data.periodLabel)}</div>` : ''}
        ${data.status ? `<div>Status ${esc(data.status)}</div>` : ''}
      </div>
    </div>
    ${
      data.billTo
        ? `<div class="bd-parties">
            <div class="bd-card">
              <h2>Bill to</h2>
              <p><strong>${esc(data.billTo.name)}</strong></p>
              ${data.billTo.email ? `<p>${esc(data.billTo.email)}</p>` : ''}
              ${data.billTo.phone ? `<p>${esc(data.billTo.phone)}</p>` : ''}
              ${data.billTo.address ? `<p>${esc(data.billTo.address)}</p>` : ''}
            </div>
            <div class="bd-card">
              <h2>Document</h2>
              <p>${esc(kindLabel)}</p>
              <p>${esc(company.vatInclusive ? 'Amounts include VAT' : 'Amounts exclude VAT')}</p>
              <p>${esc(company.plan)}</p>
            </div>
          </div>`
        : ''
    }
    ${meta}
    ${lines}
    ${table}
    <div class="bd-totals">
      ${data.subtotal ? `<div><span>Subtotal</span><strong>${esc(data.subtotal)}</strong></div>` : ''}
      ${data.vat ? `<div><span>VAT</span><strong>${esc(data.vat)}</strong></div>` : ''}
      <div class="bd-total"><span>Total</span><strong>${esc(data.total)}</strong></div>
    </div>
    ${notes}
    <footer class="bd-footer">
      <span>Generated by ${esc(company.tradingName)} · ${esc(company.legalName)}</span>
      <span>${esc(kindLabel)} ${esc(data.reference)}</span>
    </footer>
  </article>
  ${options?.autoPrint ? '<script>window.addEventListener("load", () => setTimeout(() => window.print(), 250));</script>' : ''}
</body>
</html>`;
}

/** Open a branded printable document in a new window (Print → Save as PDF). */
export function openBrandedDocument(data: BrandedDocumentData, options?: { autoPrint?: boolean }) {
  const html = buildBrandedDocumentHtml(data, options);
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=960,height=900');
  if (!popup) {
    // Popup blocked — fall back to downloadable HTML template.
    downloadBrandedDocument(data);
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

/** Download the branded template as an HTML file the user can open/print. */
export function downloadBrandedDocument(data: BrandedDocumentData) {
  const html = buildBrandedDocumentHtml(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeRef = data.reference.replace(/[^\w.-]+/g, '_');
  a.href = url;
  a.download = `${data.kind.toLowerCase()}-${safeRef}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function demoClientBillTo() {
  return {
    name: 'Nomsa Client',
    email: 'client@demo.local',
    phone: '+27 82 123 4567',
    address: 'Umhlanga Rocks, Durban',
  };
}

/** Open a branded printable table report (ops CSV companions). */
export function openBrandedTableReport(input: {
  title: string;
  filenameStem?: string;
  headers: string[];
  rows: (string | number | null)[][];
  notes?: string[];
}) {
  const stamp = new Date().toISOString();
  const company = getCompanyProfile();
  openBrandedDocument(
    {
      kind: 'REPORT',
      title: input.title,
      reference: `${(input.filenameStem || 'report').toUpperCase()}-${stamp.slice(0, 10).replace(/-/g, '')}`,
      issuedAt: stamp,
      billTo: {
        name: company.legalName,
        email: company.invoiceEmail || undefined,
        phone: company.supportPhone || undefined,
        address: company.address || undefined,
      },
      total: `${input.rows.length} rows`,
      table: {
        headers: input.headers,
        rows: input.rows,
      },
      notes: input.notes ?? [
        'Company-letterheaded operations export.',
        'Use Print / Save as PDF for an archive copy.',
      ],
    },
    { autoPrint: true },
  );
}
