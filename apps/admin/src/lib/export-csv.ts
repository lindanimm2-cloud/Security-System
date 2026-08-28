import { getCompanyProfile } from '@/lib/company-profile';

function escapeCell(value: string | number | null): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export type CsvExportOptions = {
  title?: string;
  companyName?: string;
};

/** CSV download with optional branded metadata preamble for spreadsheet archives. */
export function exportCsv(
  filename: string,
  rows: Record<string, string | number | null>[],
  options?: CsvExportOptions,
): void {
  if (!rows.length) return;
  const company = getCompanyProfile();
  const headers = Object.keys(rows[0]);
  const lines = [
    `# ${options?.title || 'Export'}`,
    `# Company: ${options?.companyName || company.legalName}`,
    `# Trading as: ${company.tradingName}`,
    company.registration ? `# Registration: ${company.registration}` : null,
    company.vatNumber ? `# VAT: ${company.vatNumber}` : null,
    `# Generated: ${new Date().toISOString()}`,
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h] ?? null)).join(',')),
  ].filter((line): line is string => line != null);
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
