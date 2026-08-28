/** South African banks commonly used for Naedo / DebiCheck debit orders. */
export const ZA_BANKS = [
  { name: 'Absa', branchCode: '632005' },
  { name: 'African Bank', branchCode: '430000' },
  { name: 'Bank Zero', branchCode: '888000' },
  { name: 'Bidvest Bank', branchCode: '462005' },
  { name: 'Capitec', branchCode: '470010' },
  { name: 'Discovery Bank', branchCode: '679000' },
  { name: 'FNB', branchCode: '250655' },
  { name: 'Investec', branchCode: '580105' },
  { name: 'Nedbank', branchCode: '198765' },
  { name: 'Standard Bank', branchCode: '051001' },
  { name: 'TymeBank', branchCode: '678910' },
] as const;

export const ZA_ACCOUNT_TYPES = [
  { value: 'CHEQUE', label: 'Cheque / current' },
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'TRANSMISSION', label: 'Transmission' },
] as const;

export const ZA_DEBIT_DAYS = [1, 5, 15, 25, 31] as const;

export function debitDayLabel(day: number) {
  if (day === 31) return 'Last day of month';
  const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
  return `${day}${suffix} of month`;
}

function luhnValid(digits: string) {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (!Number.isFinite(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function looksLikeCardNumber(digits: string) {
  if (digits.length < 13 || digits.length > 19) return false;
  return ['2', '3', '4', '5', '6'].includes(digits[0] ?? '');
}

export function validateZaAccountNumber(raw: string) {
  const digits = raw.replace(/[\s-]/g, '');
  if (!digits) return 'Enter your bank account number.';
  if (!/^\d+$/.test(digits)) return 'Account number must be digits only.';
  if (looksLikeCardNumber(digits)) {
    return luhnValid(digits)
      ? 'That looks like a card number. Enter your bank account number, not a debit or credit card.'
      : 'Invalid card number. Enter your bank account number instead.';
  }
  if (digits.length < 7 || digits.length > 13) {
    return 'Enter a valid South African account number (7–13 digits).';
  }
  return '';
}

export function validateZaBranchCode(raw: string) {
  const digits = raw.replace(/\s/g, '');
  if (!digits) return 'Enter the 6-digit branch code.';
  if (!/^\d{6}$/.test(digits)) return 'Branch code must be 6 digits.';
  return '';
}
