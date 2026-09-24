'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { LoginPageChrome } from '@/components/LoginPageChrome';
import { SketchIcon } from '@/components/icons/SketchIcon';
import {
  activateDemoOrgSession,
  ensureDemoOrgDirectory,
  getOrgSession,
  listOrganizations,
  listSites,
  setActiveOrganization,
} from '@/lib/org';

export default function OrgContextPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [orgs, setOrgs] = useState(() => listOrganizations());
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    ensureDemoOrgDirectory();
    setOrgs(listOrganizations());
    setSessionEmail(getOrgSession()?.user.email ?? null);
    setReady(true);
  }, []);

  function enterOrg(organizationId: string) {
    let s = getOrgSession();
    if (!s || !s.memberships.some((m) => m.organizationId === organizationId)) {
      s = activateDemoOrgSession(
        s
          ? {
              email: s.user.email,
              firstName: s.user.firstName,
              lastName: s.user.lastName,
            }
          : undefined,
      );
    }
    setActiveOrganization(organizationId);
    router.push(`/org/${organizationId}/dashboard`);
  }

  if (!ready) return null;

  return (
    <div className="login-page login-page--v2">
      <LoginPageChrome />
      <div className="login-page__inner org-chooser-inner">
        <div className="login-page__logo">
          <BrandMark variant="portal" href={false} showProduct={false} />
        </div>
        <div className="login-card login-card--v2 org-chooser-card-wrap">
          <div className="login-brand login-brand--v2">
            <h1>What would you like to manage?</h1>
            <p>
              Personal protection stays in the client portal. Organizations — malls, estates,
              companies, and multi-site properties — use this separate operations experience.
            </p>
            {sessionEmail ? (
              <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                Signed in as {sessionEmail}
              </p>
            ) : null}
          </div>

          <div className="org-chooser-grid">
            <Link href="/portal" className="org-chooser-card">
              <span className="org-chooser-card__icon" aria-hidden>
                <SketchIcon name="secure" size={22} />
              </span>
              <strong>Personal</strong>
              <span>My security, family, vehicles, and home protection.</span>
              <em>Enter personal portal</em>
            </Link>

            <div className="org-chooser-card org-chooser-card--orgs">
              <span className="org-chooser-card__icon" aria-hidden>
                <SketchIcon name="building" size={22} />
              </span>
              <strong>Organization</strong>
              <span>Manage business, property, or multi-site security operations.</span>
              <div className="org-chooser-org-list">
                {orgs.map((org) => {
                  const siteCount = listSites(org.id).length;
                  return (
                    <button key={org.id} type="button" onClick={() => enterOrg(org.id)}>
                      <strong>{org.name}</strong>
                      <span>
                        {org.typeLabel} · {siteCount} site{siteCount === 1 ? '' : 's'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <Link href="/portal/register/organisation" className="org-chooser-create">
                Create / activate organization
              </Link>
            </div>
          </div>

          <div className="login-register-links" style={{ marginTop: '1rem' }}>
            <Link href="/portal/login">Sign in</Link>
            <span className="login-register-links__sep" aria-hidden>
              ·
            </span>
            <Link href="/portals">All portals</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
