export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string;
  flag: string;
};

/** Common dial codes for portal / org registration phones. */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'ZA', name: 'South Africa', dial: '27', flag: '🇿🇦' },
  { iso: 'NA', name: 'Namibia', dial: '264', flag: '🇳🇦' },
  { iso: 'BW', name: 'Botswana', dial: '267', flag: '🇧🇼' },
  { iso: 'ZW', name: 'Zimbabwe', dial: '263', flag: '🇿🇼' },
  { iso: 'MZ', name: 'Mozambique', dial: '258', flag: '🇲🇿' },
  { iso: 'LS', name: 'Lesotho', dial: '266', flag: '🇱🇸' },
  { iso: 'SZ', name: 'Eswatini', dial: '268', flag: '🇸🇿' },
  { iso: 'AO', name: 'Angola', dial: '244', flag: '🇦🇴' },
  { iso: 'ZM', name: 'Zambia', dial: '260', flag: '🇿🇲' },
  { iso: 'MW', name: 'Malawi', dial: '265', flag: '🇲🇼' },
  { iso: 'TZ', name: 'Tanzania', dial: '255', flag: '🇹🇿' },
  { iso: 'UG', name: 'Uganda', dial: '256', flag: '🇺🇬' },
  { iso: 'NG', name: 'Nigeria', dial: '234', flag: '🇳🇬' },
  { iso: 'KE', name: 'Kenya', dial: '254', flag: '🇰🇪' },
  { iso: 'GH', name: 'Ghana', dial: '233', flag: '🇬🇭' },
  { iso: 'EG', name: 'Egypt', dial: '20', flag: '🇪🇬' },
  { iso: 'MA', name: 'Morocco', dial: '212', flag: '🇲🇦' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971', flag: '🇦🇪' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966', flag: '🇸🇦' },
  { iso: 'QA', name: 'Qatar', dial: '974', flag: '🇶🇦' },
  { iso: 'GB', name: 'United Kingdom', dial: '44', flag: '🇬🇧' },
  { iso: 'IE', name: 'Ireland', dial: '353', flag: '🇮🇪' },
  { iso: 'US', name: 'United States', dial: '1', flag: '🇺🇸' },
  { iso: 'CA', name: 'Canada', dial: '1', flag: '🇨🇦' },
  { iso: 'AU', name: 'Australia', dial: '61', flag: '🇦🇺' },
  { iso: 'NZ', name: 'New Zealand', dial: '64', flag: '🇳🇿' },
  { iso: 'DE', name: 'Germany', dial: '49', flag: '🇩🇪' },
  { iso: 'NL', name: 'Netherlands', dial: '31', flag: '🇳🇱' },
  { iso: 'BE', name: 'Belgium', dial: '32', flag: '🇧🇪' },
  { iso: 'FR', name: 'France', dial: '33', flag: '🇫🇷' },
  { iso: 'ES', name: 'Spain', dial: '34', flag: '🇪🇸' },
  { iso: 'PT', name: 'Portugal', dial: '351', flag: '🇵🇹' },
  { iso: 'IT', name: 'Italy', dial: '39', flag: '🇮🇹' },
  { iso: 'IN', name: 'India', dial: '91', flag: '🇮🇳' },
  { iso: 'PK', name: 'Pakistan', dial: '92', flag: '🇵🇰' },
  { iso: 'CN', name: 'China', dial: '86', flag: '🇨🇳' },
  { iso: 'HK', name: 'Hong Kong', dial: '852', flag: '🇭🇰' },
  { iso: 'SG', name: 'Singapore', dial: '65', flag: '🇸🇬' },
  { iso: 'JP', name: 'Japan', dial: '81', flag: '🇯🇵' },
  { iso: 'BR', name: 'Brazil', dial: '55', flag: '🇧🇷' },
];

export const DEFAULT_PHONE_COUNTRY = 'ZA';

export function phoneCountryByIso(iso: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.iso === iso) ?? PHONE_COUNTRIES[0];
}

/** Build E.164-ish display string from country ISO + national digits. */
export function formatInternationalPhone(countryIso: string, nationalNumber: string): string {
  const country = phoneCountryByIso(countryIso);
  const digits = nationalNumber.replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return `+${country.dial}`;
  return `+${country.dial} ${digits}`;
}

/** Split a stored +dial number back into country ISO + national digits. */
export function parseInternationalPhone(raw: string | null | undefined): {
  countryIso: string;
  nationalNumber: string;
} {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { countryIso: DEFAULT_PHONE_COUNTRY, nationalNumber: '' };
  }
  const digits = trimmed.replace(/\D/g, '');
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const country of sorted) {
    if (digits.startsWith(country.dial)) {
      return {
        countryIso: country.iso,
        nationalNumber: digits.slice(country.dial.length),
      };
    }
  }
  return { countryIso: DEFAULT_PHONE_COUNTRY, nationalNumber: digits.replace(/^0+/, '') };
}

export function phoneCountrySelectOptions() {
  return PHONE_COUNTRIES.map((c) => ({
    value: c.iso,
    label: `${c.flag} +${c.dial}`,
    meta: c.name,
    description: c.name,
  }));
}

export function formatSplitAddress(parts: {
  street: string;
  suburb: string;
  city: string;
  postalCode: string;
}): string {
  return [parts.street, parts.suburb, parts.city, parts.postalCode]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(', ');
}
