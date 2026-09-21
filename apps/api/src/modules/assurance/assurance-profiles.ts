export type AssuranceProfileId = 'STANDARD' | 'ENTERPRISE' | 'HIGH_ASSURANCE';

export type AssuranceProfileConfig = {
  id: AssuranceProfileId;
  label: string;
  description: string;
  requireMfaPrivileged: boolean;
  requireMfaDispatchers: boolean;
  auditHashChain: boolean;
  evidenceSha256: boolean;
  retentionDaysMin: number;
  siemExportRequired: boolean;
  passkeysRecommended: boolean;
  offlineSyncRequired: boolean;
  supplierPackRequired: boolean;
};

export const ASSURANCE_PROFILES: Record<AssuranceProfileId, AssuranceProfileConfig> = {
  STANDARD: {
    id: 'STANDARD',
    label: 'Standard',
    description: 'Private security company baseline — MFA for owners/admins, audit logging, evidence hashing.',
    requireMfaPrivileged: true,
    requireMfaDispatchers: false,
    auditHashChain: true,
    evidenceSha256: true,
    retentionDaysMin: 90,
    siemExportRequired: false,
    passkeysRecommended: false,
    offlineSyncRequired: false,
    supplierPackRequired: false,
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    label: 'Enterprise',
    description: 'Multi-branch ops — dispatcher MFA optional/on, SIEM export, longer retention, branch scoping.',
    requireMfaPrivileged: true,
    requireMfaDispatchers: true,
    auditHashChain: true,
    evidenceSha256: true,
    retentionDaysMin: 365,
    siemExportRequired: true,
    passkeysRecommended: true,
    offlineSyncRequired: true,
    supplierPackRequired: false,
  },
  HIGH_ASSURANCE: {
    id: 'HIGH_ASSURANCE',
    label: 'High assurance',
    description:
      'Government / critical-ops target profile — strict MFA, immutable audit chain, SIEM, supplier readiness pack. Not a certification.',
    requireMfaPrivileged: true,
    requireMfaDispatchers: true,
    auditHashChain: true,
    evidenceSha256: true,
    retentionDaysMin: 2555, // ~7 years working assumption
    siemExportRequired: true,
    passkeysRecommended: true,
    offlineSyncRequired: true,
    supplierPackRequired: true,
  },
};

export function parseAssuranceProfile(raw: unknown): AssuranceProfileId {
  if (raw === 'ENTERPRISE' || raw === 'HIGH_ASSURANCE' || raw === 'STANDARD') return raw;
  return 'STANDARD';
}

export function readAssuranceProfileFromSettings(settings: unknown): AssuranceProfileId {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return 'STANDARD';
  const root = settings as Record<string, unknown>;
  const assurance = root.assurance;
  if (assurance && typeof assurance === 'object' && !Array.isArray(assurance)) {
    return parseAssuranceProfile((assurance as Record<string, unknown>).profile);
  }
  return parseAssuranceProfile(root.assuranceProfile);
}

export function getAssuranceProfileConfig(id: AssuranceProfileId): AssuranceProfileConfig {
  return ASSURANCE_PROFILES[id];
}
