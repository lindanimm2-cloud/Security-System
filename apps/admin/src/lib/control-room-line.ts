/** Format SA E.164 numbers for display, e.g. +27111004400 → +27 11 100 4400 */
export function formatZaPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('27') && digits.length >= 11) {
    const rest = digits.slice(2);
    if (rest.length === 9) {
      return `+27 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`;
    }
  }
  return phone;
}

const PHONE = '+27111004400';

export const CONTROL_ROOM_LINE = {
  name: '4DS Control Room',
  /** E.164 for tel: / API */
  phone: PHONE,
  /** Spaced display alias */
  display: formatZaPhone(PHONE),
} as const;
