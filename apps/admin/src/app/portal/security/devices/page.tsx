'use client';

import Link from 'next/link';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DeviceStatusBadge } from '@/components/security/DeviceStatusBadge';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { SecurityArticle, SecurityDocFrame } from '@/components/security/SecurityDocFrame';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

type Device = {
  id: string;
  publicId: string;
  name: string;
  status: string;
  isPrimary: boolean;
  osName: string | null;
  osVersion: string | null;
  lastActiveLabel: string;
};

export default function DevicesPage() {
  return (
    <PortalLayout>
      <DevicesContent />
    </PortalLayout>
  );
}

function DevicesContent() {
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<Device[]>>('/client/security/devices'),
    [],
  );
  const devices = data?.data ?? [];
  const primary = devices.find((d) => d.isPrimary);
  const others = devices.filter((d) => !d.isPrimary);

  if (loading) return <LoadingSpinner label="Loading devices…" fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className="page-content sec-page">
      <SecurityDocFrame
        docId="SCH-DEV-01"
        kicker="Client protection file"
        title="Trusted devices"
        summary="This device is identified with an internal ID. IMEI is never used as the primary security identifier. Location is shown only where legally permitted and permission exists."
        toc={[
          { id: 'primary', label: 'Primary device' },
          { id: 'others', label: 'Other devices' },
          { id: 'file', label: 'Protection file', href: '/portal/security' },
        ]}
      >
        <SecurityArticle id="primary" number="01" title="Primary security device">
          {primary ? (
            <article className="sec-sheet">
              <p className="sec-trust__kicker">Device trust status</p>
              <div className="sec-sheet__identity">
                <h3>{primary.name}</h3>
                <DeviceStatusBadge status={primary.status} isPrimary />
                <span className="sec-trust__mark">Verified</span>
              </div>
              <p className="sec-sheet__lede">Primary registered device on this protection file.</p>
              <p className="sec-sheet__meta">
                Last verified · {primary.lastActiveLabel}
                {primary.osName ? ` · ${primary.osName}${primary.osVersion ? ` ${primary.osVersion}` : ''}` : ''}
              </p>
              <div className="sec-sheet__actions">
                <Link className="btn-primary btn-primary--calm" href={`/portal/security/devices/${primary.id}`}>
                  Open record
                </Link>
                <Link href={`/portal/security/devices/${primary.id}?action=lock`}>Lock</Link>
                <Link href={`/portal/security/devices/${primary.id}?action=lost`}>Mark lost</Link>
                <Link href="/portal/security/replace-device">Replace</Link>
              </div>
            </article>
          ) : (
            <p className="alert">No primary device. Register this device during setup.</p>
          )}
        </SecurityArticle>

        <SecurityArticle id="others" number="02" title="Other devices">
          {others.length === 0 ? (
            <p className="sec-article__note">No additional devices are recorded on this file.</p>
          ) : (
            <ul className="sec-device-list">
              {others.map((device) => (
                <li key={device.id}>
                  <Link href={`/portal/security/devices/${device.id}`} className="sec-device-row">
                    <div>
                      <strong>{device.name}</strong>
                      <p className="text-muted">{device.publicId}</p>
                    </div>
                    <DeviceStatusBadge status={device.status} isPrimary={device.isPrimary} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SecurityArticle>
      </SecurityDocFrame>
    </div>
  );
}
