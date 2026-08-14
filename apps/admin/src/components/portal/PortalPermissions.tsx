'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { usePortalPermissions } from '@/hooks/usePortalPermissions';
import { PORTAL_PERMISSIONS_PROFILE_HASH } from '@/lib/portal-permissions';

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
            Only permissions for your active protection features are shown.
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

export function PortalPermissionsBanner() {
  const { access, loading: accessLoading } = useSubscriptionAccess();
  const { missing, allowAll, requesting } = usePortalPermissions(access);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(BANNER_DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (accessLoading || !access || missing.length === 0 || dismissed) return null;

  const denied = missing.filter((m) => m.state === 'denied');
  const prompt = missing.filter((m) => m.state === 'prompt');

  return (
    <div className="portal-permissions-banner" role="status">
      <div className="portal-permissions-banner__copy">
        <strong>
          {denied.length > 0
            ? 'Some safety features need permission'
            : 'Allow permissions for full protection'}
        </strong>
        <p className="text-muted">
          {prompt.length > 0
            ? `${prompt.map((m) => m.label).join(', ')} — tap Allow so dispatch and alerts work properly.`
            : `${denied.map((m) => m.label).join(', ')} blocked in browser settings.`}
        </p>
      </div>
      <div className="portal-permissions-banner__actions">
        <button
          type="button"
          className="btn-sm btn-primary"
          disabled={!!requesting}
          onClick={() => void allowAll()}
        >
          {requesting ? '…' : 'Allow now'}
        </button>
        <Link href={`/portal/profile${PORTAL_PERMISSIONS_PROFILE_HASH}`} className="btn-sm btn-secondary">
          Manage
        </Link>
        <button
          type="button"
          className="btn-sm btn-ghost"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(BANNER_DISMISS_KEY, '1');
            } catch {
              /* ignore */
            }
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
