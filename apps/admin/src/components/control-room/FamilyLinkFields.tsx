'use client';

import { UiSelect } from '@/components/ui/UiSelect';
import {
  FAMILY_RELATIONSHIP_OPTIONS,
  type FamilyLinkMode,
} from '@/lib/family-relationships';

export type FamilyLinkPrimaryOption = {
  id: string;
  label: string;
  email?: string;
};

export type FamilyLinkFamilyOption = {
  id: string;
  name: string;
  ownerName: string;
  memberCount?: number;
};

export type FamilyLinkState = {
  mode: FamilyLinkMode;
  relationship: string;
  familyId: string;
  linkToClientId: string;
  familyName: string;
};

export const EMPTY_FAMILY_LINK: FamilyLinkState = {
  mode: 'none',
  relationship: '',
  familyId: '',
  linkToClientId: '',
  familyName: '',
};

/** Payload fields accepted by POST /control-room/users for family linking. */
export function familyLinkToPayload(state: FamilyLinkState): {
  familyId?: string;
  linkToClientId?: string;
  familyRelationship?: string;
  createFamily?: boolean;
  familyName?: string;
} {
  if (state.mode === 'none') return {};

  if (state.mode === 'primary') {
    return {
      createFamily: true,
      familyName: state.familyName.trim() || undefined,
      familyRelationship: state.relationship.trim() || 'Account holder',
    };
  }

  return {
    ...(state.familyId ? { familyId: state.familyId } : {}),
    ...(state.linkToClientId ? { linkToClientId: state.linkToClientId } : {}),
    familyRelationship: state.relationship.trim() || undefined,
  };
}

export function validateFamilyLink(
  state: FamilyLinkState,
  opts?: { role?: string },
): string | null {
  const role = opts?.role;
  const isFamilyMember = role === 'FAMILY_MEMBER';
  const effectiveMode: FamilyLinkMode =
    isFamilyMember && state.mode === 'none' ? 'member' : state.mode;

  if (effectiveMode === 'none') return null;

  if (effectiveMode === 'primary') {
    return null;
  }

  if (!state.familyId && !state.linkToClientId) {
    return 'Choose a family group or primary client to link.';
  }
  if (!state.relationship.trim()) {
    return 'Select a family relationship type (Spouse, Child, Parent, …).';
  }
  return null;
}

export function FamilyLinkFields({
  value,
  onChange,
  primaries,
  families,
  requireMember = false,
  disabled = false,
}: {
  value: FamilyLinkState;
  onChange: (next: FamilyLinkState) => void;
  primaries: FamilyLinkPrimaryOption[];
  families: FamilyLinkFamilyOption[];
  /** When true (FAMILY_MEMBER role), hide “none” and force a household link. */
  requireMember?: boolean;
  disabled?: boolean;
}) {
  const mode = requireMember && value.mode === 'none' ? 'member' : value.mode;

  return (
    <div className="family-link-fields stack-form">
      <label>
        Family / household
        <UiSelect
          compact={false}
          ariaLabel="Family link mode"
          value={mode}
          disabled={disabled}
          onChange={(next) => {
            const nextMode = next as FamilyLinkMode;
            onChange({
              ...value,
              mode: nextMode,
              relationship:
                nextMode === 'primary' && !value.relationship
                  ? 'Account holder'
                  : nextMode === 'none'
                    ? ''
                    : value.relationship === 'Account holder' && nextMode === 'member'
                      ? ''
                      : value.relationship,
              familyId: nextMode === 'member' ? value.familyId : '',
              linkToClientId: nextMode === 'member' ? value.linkToClientId : '',
            });
          }}
          options={[
            ...(requireMember
              ? []
              : [{ value: 'none', label: 'No household link' }]),
            ...(requireMember
              ? []
              : [{ value: 'primary', label: 'New household (account holder)' }]),
            { value: 'member', label: 'Link to existing household' },
          ]}
        />
      </label>

      {mode === 'primary' ? (
        <>
          <label>
            Household name
            <input
              value={value.familyName}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, mode: 'primary', familyName: e.target.value })}
              placeholder="Optional — defaults to Last name Family"
            />
          </label>
          <label>
            Relationship
            <UiSelect
              compact={false}
              ariaLabel="Family relationship"
              value={value.relationship || 'Account holder'}
              disabled={disabled}
              onChange={(relationship) =>
                onChange({ ...value, mode: 'primary', relationship })
              }
              options={FAMILY_RELATIONSHIP_OPTIONS.map((r) => ({
                value: r,
                label: r,
              }))}
            />
          </label>
        </>
      ) : null}

      {mode === 'member' ? (
        <>
          <label>
            Existing family group
            <UiSelect
              compact={false}
              searchable={families.length > 8}
              ariaLabel="Family group"
              placeholder="Select family…"
              value={value.familyId}
              disabled={disabled}
              onChange={(familyId) =>
                onChange({
                  ...value,
                  mode: 'member',
                  familyId,
                  linkToClientId: familyId ? '' : value.linkToClientId,
                })
              }
              options={[
                { value: '', label: '— Select family —' },
                ...families.map((f) => ({
                  value: f.id,
                  label: f.name,
                  meta: `${f.ownerName}${f.memberCount != null ? ` · ${f.memberCount} members` : ''}`,
                })),
              ]}
            />
          </label>
          <label>
            Or link via primary client
            <UiSelect
              compact={false}
              searchable={primaries.length > 8}
              ariaLabel="Primary client"
              placeholder="Select primary client…"
              value={value.linkToClientId}
              disabled={disabled}
              onChange={(linkToClientId) =>
                onChange({
                  ...value,
                  mode: 'member',
                  linkToClientId,
                  familyId: linkToClientId ? '' : value.familyId,
                })
              }
              options={[
                { value: '', label: '— Select client —' },
                ...primaries.map((p) => ({
                  value: p.id,
                  label: p.label,
                  meta: p.email,
                })),
              ]}
            />
          </label>
          <label>
            Relationship type
            <UiSelect
              compact={false}
              ariaLabel="Family relationship"
              placeholder="Select relationship…"
              value={value.relationship}
              disabled={disabled}
              onChange={(relationship) =>
                onChange({ ...value, mode: 'member', relationship })
              }
              options={[
                { value: '', label: '— Select —' },
                ...FAMILY_RELATIONSHIP_OPTIONS.filter((r) => r !== 'Account holder').map(
                  (r) => ({ value: r, label: r }),
                ),
              ]}
            />
          </label>
        </>
      ) : null}
    </div>
  );
}
