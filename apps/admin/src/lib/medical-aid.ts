/**
 * South African medical scheme (medical aid) options for emergency profiles.
 * Popular open / restricted schemes used as a reference list — not exhaustive.
 */

export const SA_MEDICAL_AID_SCHEMES = [
  'Discovery Health',
  'Bonitas',
  'Momentum Medical Scheme',
  'GEMS',
  'Bestmed',
  'Medihelp',
  'Fedhealth',
  'Medshield',
  'KeyHealth',
  'Bankmed',
  'Profmed',
  'Sizwe Hosmed',
  'Polmed',
  'CompCare',
  'Other',
  'None / self-funded',
] as const;

export type SaMedicalAidScheme = (typeof SA_MEDICAL_AID_SCHEMES)[number];

/** Select options — empty means no medical aid / skip for now. */
export const MEDICAL_AID_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'No medical aid / skip' },
  ...SA_MEDICAL_AID_SCHEMES.map((scheme) => ({ value: scheme, label: scheme })),
];

export type MedicalAidFields = {
  medicalAidType?: string | null;
  medicalAidMemberNumber?: string | null;
  medicalAidPlan?: string | null;
};

/** True when a real scheme is chosen (not empty / none / self-funded). */
export function showsMedicalAidDetails(type?: string | null): boolean {
  const scheme = (type ?? '').trim();
  if (!scheme) return false;
  if (scheme === 'None / self-funded') return false;
  return true;
}

export function medicalAidSummaryLabel(type?: string | null, memberNumber?: string | null): string {
  const scheme = (type ?? '').trim();
  const member = (memberNumber ?? '').trim();
  if (!scheme && !member) return '';
  if (scheme && member) return `${scheme} · ${member}`;
  return scheme || member;
}
