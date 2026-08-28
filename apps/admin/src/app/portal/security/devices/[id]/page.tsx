'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { DeviceStatusBadge } from '@/components/security/DeviceStatusBadge';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { SecurityArticle, SecurityDocFrame } from '@/components/security/SecurityDocFrame';
import { UiSelect } from '@/components/ui/UiSelect';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';

type DeviceDetail = {
  id: string;
  publicId: string;
  name: string;
  deviceType: string;
  osName: string | null;
  osVersion: string | null;
  appVersion: string | null;
  status: string;
  isPrimary: boolean;
  isLocked: boolean;
  lostReason: string | null;
  nativeSos: string;
  nativeSosNote: string | null;
  lastActiveLabel: string;
  lastAuthAt: string | null;
  lastFailedAuthAt: string | null;
  registeredAt: string;
  location: { lat: number; lng: number; accuracy: number | null } | null;
};

export default function DeviceDetailPage() {
  return (
    <PortalLayout>
      <DeviceDetail />
    </PortalLayout>
  );
}

function DeviceDetail() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<DeviceDetail>>(`/client/security/devices/${params.id}`),
    [params.id],
  );
  const device = data?.data;
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [lostReason, setLostReason] = useState('LOST');
  const initialAction = search.get('action');
  const [dialog, setDialog] = useState(initialAction === 'lost' || initialAction === 'lock' ? initialAction : '');

  const rows = useMemo(() => {
    if (!device) return [];
    return [
      ['Device name', device.name],
      ['Device type', device.deviceType],
      ['OS', `${device.osName ?? '—'} ${device.osVersion ?? ''}`.trim()],
      ['App version', device.appVersion ?? '—'],
      ['Internal device ID', device.publicId],
      ['Registered', new Date(device.registeredAt).toLocaleString()],
      ['Last active', device.lastActiveLabel],
      ['Last authentication', device.lastAuthAt ? new Date(device.lastAuthAt).toLocaleString() : '—'],
      ['Last failed authentication', device.lastFailedAuthAt ? new Date(device.lastFailedAuthAt).toLocaleString() : '—'],
      ['Native SOS', 'Not available on this web application'],
    ];
  }, [device]);

  async function run(path: string, body?: unknown, label = 'Updated') {
    setBusy(path);
    setMsg('');
    try {
      await clientApi.post(path, body);
      setMsg(label);
      setDialog('');
      void reload();
    } catch (e) {
      setMsg(friendlyErrorMessage(e, 'action'));
    } finally {
      setBusy('');
    }
  }

  if (loading) return <LoadingSpinner label="Loading device…" fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  if (!device) return <p>Device not found.</p>;

  return (
    <div className="page-content sec-page">
      <SecurityDocFrame
        docId={`DEV-${device.publicId.slice(0, 8).toUpperCase()}`}
        kicker="Device record"
        title={device.name}
        summary="Security profile for this trusted or temporary device. Native SOS is not available on this web application."
        toc={[
          { id: 'particulars', label: 'Particulars' },
          { id: 'actions', label: 'Actions' },
          { id: 'schedule', label: 'Device schedule', href: '/portal/security/devices' },
        ]}
      >
        <SecurityArticle id="particulars" number="01" title="Particulars">
          <p>
            <DeviceStatusBadge status={device.status} isPrimary={device.isPrimary} />
          </p>
          <dl className="sec-doc-status__grid">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <div>
              <dt>Location</dt>
              <dd>
                {device.location
                  ? `${device.location.lat.toFixed(4)}, ${device.location.lng.toFixed(4)} · ${
                      device.location.accuracy != null ? `±${Math.round(device.location.accuracy)}m` : 'accuracy unknown'
                    }`
                  : 'Available only where legally permitted and permission exists.'}
              </dd>
            </div>
          </dl>
          {device.nativeSosNote ? <p className="sec-article__note">{device.nativeSosNote}</p> : null}
        </SecurityArticle>

        <SecurityArticle id="actions" number="02" title="Actions">
          {msg ? <p className="alert">{msg}</p> : null}
          <div className="sec-sheet__actions">
            <button type="button" className="btn-secondary" onClick={() => setDialog('lock')} disabled={Boolean(busy)}>
              Lock device
            </button>
            <button type="button" className="btn-ghost" onClick={() => setDialog('lost')} disabled={Boolean(busy)}>
              Mark lost / stolen
            </button>
            {!device.isPrimary ? (
              <button
                type="button"
                className="btn-primary btn-primary--calm"
                onClick={() => void run(`/client/security/devices/${device.id}/make-primary`, {}, 'Primary device updated')}
              >
                Make primary
              </button>
            ) : (
              <Link className="btn-primary btn-primary--calm" href="/portal/security/replace-device">
                Replace primary
              </Link>
            )}
            {!device.isPrimary ? (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => void run(`/client/security/devices/${device.id}/revoke`, {}, 'Device revoked')}
              >
                Revoke device
              </button>
            ) : null}
          </div>
        </SecurityArticle>
      </SecurityDocFrame>

      {dialog === 'lock' ? (
        <OpsDialog title="Lock this device?" onClose={() => setDialog('')}>
          <p>Active sessions on this device will be revoked. Historical audit records are kept.</p>
          <button
            type="button"
            className="btn-primary"
            disabled={Boolean(busy)}
            onClick={() => void run(`/client/security/devices/${device.id}/lock`, {}, 'Device locked')}
          >
            Confirm lock
          </button>
        </OpsDialog>
      ) : null}

      {dialog === 'lost' ? (
        <OpsDialog title="Report device lost / stolen" onClose={() => setDialog('')}>
          <p>
            Reporting this device as lost or stolen will immediately restrict its access to your security account.
          </p>
          <UiSelect
            value={lostReason}
            onChange={setLostReason}
            options={[
              { value: 'LOST', label: 'Lost' },
              { value: 'STOLEN', label: 'Stolen' },
              { value: 'DAMAGED', label: 'Damaged' },
              { value: 'REPLACED', label: 'Replaced' },
              { value: 'UNKNOWN', label: 'Unknown' },
            ]}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={Boolean(busy)}
            onClick={() =>
              void run(
                lostReason === 'STOLEN'
                  ? `/client/security/devices/${device.id}/report-stolen`
                  : `/client/security/devices/${device.id}/report-lost`,
                { reason: lostReason },
                'Device access restricted. Emergency recovery remains available.',
              )
            }
          >
            Confirm report
          </button>
        </OpsDialog>
      ) : null}
    </div>
  );
}
