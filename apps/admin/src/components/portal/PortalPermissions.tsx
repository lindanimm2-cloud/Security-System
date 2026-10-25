'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { usePortalPermissions } from '@/hooks/usePortalPermissions';

function statusLabel(state: string): string {
  if (state === 'granted') return 'Allowed';
  if (state === 'denied') return 'Blocked';
  if (state === 'unsupported') return 'Not available';
  if (state === 'checking') return 'Checking…';
  return 'Not allowed yet';
}

function statusClass(state: string): string {
  if (state === 'granted') return 'portal-perm__status--ok';
  if (state === 'denied') return 'portal-perm__status--bad';
  if (state === 'unsupported') return 'portal-perm__status--muted';
  return 'portal-perm__status--warn';
}

export function PortalPermissionsSection() {
  const { access, loading: accessLoading } = useSubscriptionAccess();
  const { rows, missing, requesting, allow, allowAll } = usePortalPermissions(access);

  if (accessLoading || !access || rows.length === 0) return null;

  return (
    <section id="device-permissions" className="portal-card profile-section portal-permissions">
      <div className="card-header-row">
        <div>
          <h2>Device permissions</h2>
          <p className="text-muted portal-permissions__lead">
            Core browser grants for your plan.{' '}
            <Link href="/portal/security/emergency-setup">Emergency setup</Link> covers vibration,
            background alerts, and the full protection checklist.
          </p>
        </div>
        {missing.length > 0 ? (
          <button type="button" className="btn-sm btn-primary" onClick={() => void allowAll()}>
            Allow all
          </button>
        ) : null}
      </div>

      <ul className="portal-permissions__list">
        {rows.map((row) => (
          <li key={row.id} className="portal-permissions__item">
            <div className="portal-permissions__copy">
              <strong>{row.label}</strong>
              <p className="text-muted">{row.description}</p>
              <span className="portal-permissions__for">For: {row.features}</span>
            </div>
            <div className="portal-permissions__actions">
              <span className={`portal-perm__status ${statusClass(row.state)}`}>
                {statusLabel(row.state)}
              </span>
              {row.state !== 'granted' && row.state !== 'unsupported' ? (
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  disabled={requesting === row.id}
                  onClick={() => void allow(row.id)}
                >
                  {requesting === row.id ? '…' : 'Allow'}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {missing.some((m) => m.state === 'denied') ? (
        <p className="portal-permissions__hint text-muted">
          If a permission is blocked, open your browser or phone settings for this site and enable
          it manually, then return here.
        </p>
      ) : null}
    </section>
  );
}

const BANNER_DISMISS_KEY = 'portal-perms-banner-dismiss';
const BANNER_HIDE_AFTER_ACCEPT_MS = 2800;

function dismissBanner(setDismissed: (value: boolean) => void) {
  setDismissed(true);
  try {
    sessionStorage.setItem(BANNER_DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function PortalPermissionsBanner() {
  const { access, loading: accessLoading } = useSubscriptionAccess();
  const { missing, allowAll, requesting, allGranted } = usePortalPermissions(access);
  const [dismissed, setDismissed] = useState(true);
  const [justAccepted, setJustAccepted] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(BANNER_DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (!justAccepted) return;
    const timer = window.setTimeout(() => {
      dismissBanner(setDismissed);
      setJustAccepted(false);
    }, BANNER_HIDE_AFTER_ACCEPT_MS);
    return () => window.clearTimeout(timer);
  }, [justAccepted]);

  useEffect(() => {
    if (!allGranted || dismissed || justAccepted || missing.length > 0) return;
    dismissBanner(setDismissed);
  }, [allGranted, dismissed, justAccepted, missing.length]);

  async function onAllowNow() {
    try {
      await allowAll();
    } finally {
      setJustAccepted(true);
    }
  }

  if (accessLoading || !access || dismissed) return null;
  if (missing.length === 0 && !justAccepted) return null;

  const showAccepted = justAccepted || allGranted;
  const denied = missing.filter((m) => m.state === 'denied');
  const prompt = missing.filter((m) => m.state === 'prompt');

  return (
    <div
      className={`portal-permissions-banner ${showAccepted ? 'is-accepted' : ''}`}
      role="status"
    >
      <div className="portal-permissions-banner__copy">
        <strong>
          {showAccepted
            ? 'Emergency protection enabled'
            : denied.length > 0
              ? 'Some safety features need permission'
              : 'Enable emergency protection'}
        </strong>
        <p className="text-muted">
          {showAccepted
            ? 'This notice will close in a few seconds.'
            : prompt.length > 0
              ? `${prompt.map((m) => m.label).join(', ')} — open Emergency Setup so alerts, vibration and location work.`
              : `${denied.map((m) => m.label).join(', ')} blocked in browser settings.`}
        </p>
      </div>
      {showAccepted ? null : (
        <div className="portal-permissions-banner__actions">
          <Link href="/portal/security/emergency-setup" className="btn-sm btn-primary">
            Emergency setup
          </Link>
          <button
            type="button"
            className="btn-sm btn-secondary"
            disabled={!!requesting}
            onClick={() => void onAllowNow()}
          >
            {requesting ? '…' : 'Allow now'}
          </button>
          <Link href="/portal/security/emergency-setup" className="btn-sm btn-secondary">
            Manage
          </Link>
          <button type="button" className="btn-sm btn-ghost" onClick={() => dismissBanner(setDismissed)}>
            Later
          </button>
        </div>
      )}
    </div>
  );
}
