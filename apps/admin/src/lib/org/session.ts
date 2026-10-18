import {
  DEMO_ORG_ID,
  createOrganization,
  ensureDemoOrgDirectory,
  getOrganization,
  listOrganizations,
  type CreateOrganizationInput,
} from './demo-data';
import type { OrgMember, OrgMemberRole, OrgSession } from './types';

const SESSION_KEY = '4ds-org-session-v1';

function notify() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('4ds-org-session-changed'));
}

export function getOrgSession(): OrgSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrgSession;
  } catch {
    return null;
  }
}

export function persistOrgSession(session: OrgSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  notify();
}

export function clearOrgSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
  notify();
}

export function setActiveOrganization(organizationId: string) {
  const session = getOrgSession();
  if (!session) return;
  if (!session.memberships.some((m) => m.organizationId === organizationId)) return;
  persistOrgSession({
    ...session,
    activeOrganizationId: organizationId,
    activeSiteId: 'all',
  });
}

export function setActiveSite(siteId: string | 'all') {
  const session = getOrgSession();
  if (!session) return;
  persistOrgSession({ ...session, activeSiteId: siteId });
}

export function userCanAccessOrganization(organizationId: string): boolean {
  const session = getOrgSession();
  if (!session) return false;
  return session.memberships.some((m) => m.organizationId === organizationId);
}

export function activateDemoOrgSession(overrides?: {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: OrgMemberRole;
  organizationId?: string;
}): OrgSession {
  ensureDemoOrgDirectory();
  const email = (overrides?.email ?? 'org.admin@demo.local').trim().toLowerCase();
  const firstName = overrides?.firstName ?? 'Org';
  const lastName = overrides?.lastName ?? 'Admin';
  const role = overrides?.role ?? 'admin';
  const organizationId = overrides?.organizationId ?? DEMO_ORG_ID;
  const userId = `org-user-${email.replace(/[^a-z0-9]+/gi, '-')}`;

  const membership: OrgMember = {
    userId,
    organizationId,
    role,
    email,
    firstName,
    lastName,
  };

  const existing = getOrgSession();
  const memberships = existing?.memberships?.length
    ? [
        membership,
        ...existing.memberships.filter((m) => m.organizationId !== organizationId),
      ]
    : [membership];

  if (organizationId !== DEMO_ORG_ID && getOrganization(DEMO_ORG_ID)) {
    if (!memberships.some((m) => m.organizationId === DEMO_ORG_ID)) {
      memberships.push({
        ...membership,
        organizationId: DEMO_ORG_ID,
      });
    }
  }

  const session: OrgSession = {
    user: { id: userId, email, firstName, lastName },
    memberships,
    activeOrganizationId: organizationId,
    activeSiteId: 'all',
    accessToken: `demo-org-token-${userId}`,
  };
  persistOrgSession(session);
  return session;
}

export function completeOrganizationOnboarding(input: CreateOrganizationInput): {
  organizationId: string;
  session: OrgSession;
} {
  ensureDemoOrgDirectory();
  const org = createOrganization(input);
  const email = input.primaryContactEmail.trim().toLowerCase();
  const [firstName, ...rest] = input.primaryContactName.trim().split(/\s+/);
  const lastName = rest.join(' ') || 'Admin';
  const userId = `org-user-${email.replace(/[^a-z0-9]/gi, '-')}`;

  const membership: OrgMember = {
    userId,
    organizationId: org.id,
    role: 'owner',
    email,
    firstName: firstName || 'Org',
    lastName,
  };

  const existing = getOrgSession();
  const demoMembership: OrgMember | null = getOrganization(DEMO_ORG_ID)
    ? {
        userId,
        organizationId: DEMO_ORG_ID,
        role: 'admin',
        email,
        firstName: firstName || 'Org',
        lastName,
      }
    : null;

  const memberships: OrgMember[] = [
    membership,
    ...(demoMembership ? [demoMembership] : []),
    ...(existing?.memberships.filter(
      (m) => m.organizationId !== org.id && m.organizationId !== DEMO_ORG_ID,
    ) ?? []),
  ];

  const session: OrgSession = {
    user: {
      id: userId,
      email,
      firstName: firstName || 'Org',
      lastName,
    },
    memberships,
    activeOrganizationId: org.id,
    activeSiteId: 'all',
    accessToken: `demo-org-token-${userId}`,
  };
  persistOrgSession(session);
  return { organizationId: org.id, session };
}
