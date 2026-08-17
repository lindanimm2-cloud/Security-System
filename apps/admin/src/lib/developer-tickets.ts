/** Short ticket id shown on the developer desk and in notifications. */
export function developerTicketCode(id: string): string {
  const compact = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const tail = (compact.slice(-4) || '0000').padStart(4, '0');
  return `DEV-${tail}`;
}

export const DEMO_ERROR_REPORTS_KEY = '4ds-demo-error-reports';
export const DEMO_DEV_TICKET_EVENT = '4ds-demo-dev-ticket';
