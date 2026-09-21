/** Kinship / household relationship labels used across control room + portal. */
export const FAMILY_RELATIONSHIP_OPTIONS = [
  'Account holder',
  'Spouse',
  'Partner',
  'Parent',
  'Child',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Aunt / Uncle',
  'Cousin',
  'Guardian',
  'Caregiver',
  'Other relative',
  'Friend',
  'Neighbor',
] as const;

export type FamilyRelationship = (typeof FAMILY_RELATIONSHIP_OPTIONS)[number];

export type FamilyLinkMode = 'none' | 'primary' | 'member';

export function isFamilyRelationship(value: string): value is FamilyRelationship {
  return (FAMILY_RELATIONSHIP_OPTIONS as readonly string[]).includes(value);
}

export function familyRelationshipSelectValue(value: string) {
  if (!value.trim()) return '';
  return isFamilyRelationship(value) ? value : 'Other relative';
}
