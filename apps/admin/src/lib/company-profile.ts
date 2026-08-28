import { loadCrSettings } from '@/lib/control-room-settings';

export const COMPANY_LOGO_SRC = '/brand/4ds-logo.png';

export type CompanyProfile = {
  legalName: string;
  tradingName: string;
  registration: string;
  vatNumber: string;
  address: string;
  supportPhone: string;
  afterHoursPhone: string;
  invoiceEmail: string;
  logoUrl: string;
  vatInclusive: boolean;
  plan: string;
};

/** Organisation branding used on invoices, receipts, statements and audit exports. */
export function getCompanyProfile(): CompanyProfile {
  const settings = loadCrSettings();
  const org = settings.organisation;
  const billing = settings.billing;
  return {
    legalName: org.name?.trim() || '4DS Solutions',
    tradingName: org.tradingName?.trim() || '4DS Nexus',
    registration: org.registration?.trim() || '',
    vatNumber: org.vat?.trim() || '',
    address: org.address?.trim() || '',
    supportPhone: org.supportPhone?.trim() || '',
    afterHoursPhone: org.afterHoursPhone?.trim() || '',
    invoiceEmail: billing.invoiceEmail?.trim() || '',
    logoUrl: COMPANY_LOGO_SRC,
    vatInclusive: billing.vatInclusive,
    plan: billing.plan?.trim() || 'Subscription',
  };
}

export function companyAbsoluteLogoUrl(origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
  const profile = getCompanyProfile();
  if (profile.logoUrl.startsWith('http')) return profile.logoUrl;
  return `${origin}${profile.logoUrl}`;
}
