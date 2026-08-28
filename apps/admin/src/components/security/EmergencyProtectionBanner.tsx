'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { DeviceStatusBadge } from './DeviceStatusBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';

type SecurityStatus = {
  protected: boolean;
  lockdownActive: boolean;
  primaryDevice: { name: string; status: string; isPrimary: boolean } | null;
  nativeSos: { status: string };
  emergencyAccessAvailable: boolean;
  contactCount: number;
  readiness: { score: number };
  disclaimer: string;
};

export function EmergencyProtectionBanner({
  compact = false,
  variant = 'card',
}: {
  compact?: boolean;
  variant?: 'card' | 'doc';
}) {
  const { data } = useApi(
    () => clientApi.get<ApiResponse<SecurityStatus>>('/client/security/status'),
    [],
  );
  const status = data?.data;
  if (!status) return null;

  const title = status.lockdownActive
    ? 'Lockdown'
    : status.protected
      ? 'Protected'
      : 'Setup required';
  const meta = status.primaryDevice
    ? 'Primary device connected · Location ready'
    : 'Primary device not registered';

  if (compact) {
    return (
      <section className="ec-protect" aria-label="Emergency protection">
        <div>
          <p className="ec-kicker">Emergency protection</p>
          <strong className={status.protected && !status.lockdownActive ? undefined : 'ec-protect__warn'}>
            {title}
          </strong>
        </div>
        <p className="ec-protect__meta">
          <span className={`ec-dot ${status.protected ? '' : 'ec-dot--warn'}`} aria-hidden />
          {meta}
        </p>
      </section>
    );
  }

  if (variant === 'doc') {
    return (
      <div className="sec-doc-status">
        <div className="sec-doc-status__lead">
          <div>
            <strong>{status.lockdownActive ? 'Security lockdown active' : title}</strong>
            <p>{meta}</p>
          </div>
          <StatusBadge
            status={title}
            tone={status.lockdownActive ? 'danger' : status.protected ? 'success' : 'warning'}
          />
        </div>
        <dl className="sec-doc-status__grid">
          <div>
            <dt>Primary device</dt>
            <dd>
              {status.primaryDevice ? (
                <>
                  {status.primaryDevice.name}{' '}
                  <DeviceStatusBadge status={status.primaryDevice.status} isPrimary />
                </>
              ) : (
                'Not registered'
              )}
            </dd>
          </div>
          <div>
            <dt>Native SOS</dt>
            <dd>
              {status.nativeSos.status === 'NOT_AVAILABLE'
                ? 'Unavailable on web'
                : status.nativeSos.status.replaceAll('_', ' ')}
            </dd>
          </div>
          <div>
            <dt>Emergency access</dt>
            <dd>{status.emergencyAccessAvailable ? 'Available' : 'Unavailable'}</dd>
          </div>
          <div>
            <dt>Emergency contacts</dt>
            <dd>{status.contactCount} configured</dd>
          </div>
          <div>
            <dt>Readiness</dt>
            <dd>{status.readiness.score}%</dd>
          </div>
        </dl>
        <div className="sec-banner__actions">
          <Link className="btn-secondary" href="/portal/security/devices">
            Manage devices
          </Link>
          <Link className="btn-secondary" href="/portal/security/emergency-access">
            Emergency access
          </Link>
          <Link className="btn-ghost btn-sm" href="/portal/security/lockdown">
            Lockdown
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className={`sec-banner ${status.lockdownActive ? 'sec-banner--lock' : status.protected ? 'sec-banner--ok' : 'sec-banner--setup'}`} aria-label="Emergency protection">
      <div className="sec-banner__head">
        <div>
          <p className="sec-kicker">Emergency protection</p>
          <h2>{status.lockdownActive ? 'Security lockdown active' : title}</h2>
          <p className="sec-banner__lede">{status.disclaimer}</p>
        </div>
        <StatusBadge
          status={title}
          tone={status.lockdownActive ? 'danger' : status.protected ? 'success' : 'warning'}
        />
      </div>
      <dl className="sec-banner__meta">
        <div>
          <dt>Primary device</dt>
          <dd>
            {status.primaryDevice ? (
              <>
                {status.primaryDevice.name}{' '}
                <DeviceStatusBadge status={status.primaryDevice.status} isPrimary />
              </>
            ) : (
              'Not registered'
            )}
          </dd>
        </div>
        <div>
          <dt>Native SOS</dt>
          <dd>{status.nativeSos.status === 'NOT_AVAILABLE' ? 'Unavailable on web' : status.nativeSos.status.replaceAll('_', ' ')}</dd>
        </div>
        <div>
          <dt>Emergency access</dt>
          <dd>{status.emergencyAccessAvailable ? 'Available' : 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Emergency contacts</dt>
          <dd>{status.contactCount} configured</dd>
        </div>
        <div>
          <dt>Readiness</dt>
          <dd>{status.readiness.score}%</dd>
        </div>
      </dl>
      <div className="sec-banner__actions">
        <Link className="btn-secondary" href="/portal/security/devices">
          Manage devices
        </Link>
        <Link className="btn-secondary" href="/portal/security/emergency-access">
          Emergency access
        </Link>
        <Link className="btn-ghost btn-sm" href="/portal/security/lockdown">
          Lockdown
        </Link>
      </div>
    </section>
  );
}
