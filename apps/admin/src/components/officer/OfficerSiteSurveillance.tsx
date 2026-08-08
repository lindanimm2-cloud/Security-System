'use client';

import { useApi } from '@/hooks/useApi';
import { officerApi, type ApiResponse } from '@/lib/api-client';

type SiteContext = {
  incidentId: string;
  property: {
    id: string;
    name: string;
    address: string;
    accessNotes: string | null;
    gateCode: string | null;
    keyHolder: string | null;
    alarmStatus: string;
  } | null;
  privacy?: {
    shareInteriorCameras: boolean;
    interiorUnlocked: boolean;
    unlockReason: string;
    unlockLabel: string;
    interiorCameraCount: number;
    privateInteriorCount: number;
  };
  cameras: {
    id: string;
    name: string;
    locationLabel: string;
    channel: number;
    status: string;
    isInterior?: boolean;
    privacyLocked?: boolean;
  }[];
  events: {
    id: string;
    title: string;
    type: string;
    status: string;
    triggeredAt: string;
  }[];
};

type Props = {
  incidentId?: string;
};

export function OfficerSiteSurveillance({ incidentId }: Props) {
  const { data, loading, error } = useApi(
    () =>
      officerApi.get<ApiResponse<SiteContext | null>>(
        `/officer/surveillance${incidentId ? `?incidentId=${incidentId}` : ''}`,
      ),
    [incidentId],
  );

  if (loading) {
    return (
      <section className="portal-card">
        <p className="text-muted">Loading site cameras…</p>
      </section>
    );
  }

  if (error || !data?.data) return null;

  const ctx = data.data;
  if (!ctx.property && ctx.cameras.length === 0) return null;

  const privacy = ctx.privacy;

  return (
    <section className="portal-card officer-surveillance">
      <div className="card-header-row">
        <h2>Site surveillance</h2>
        {ctx.property && (
          <span className={`status-pill status-pill--${ctx.property.alarmStatus.toLowerCase()}`}>
            {ctx.property.alarmStatus}
          </span>
        )}
      </div>

      {ctx.property && (
        <>
          <p>
            <strong>{ctx.property.name}</strong>
          </p>
          <p className="text-muted">{ctx.property.address}</p>
          {ctx.property.gateCode && (
            <p>
              <strong>Gate:</strong> {ctx.property.gateCode}
            </p>
          )}
          {ctx.property.keyHolder && (
            <p>
              <strong>Key holder:</strong> {ctx.property.keyHolder}
            </p>
          )}
          {ctx.property.accessNotes && <p className="text-muted">{ctx.property.accessNotes}</p>}
        </>
      )}

      {privacy && privacy.privateInteriorCount > 0 && !privacy.interiorUnlocked && (
        <p className="text-muted" style={{ margin: '0.5rem 0 0' }}>
          {privacy.privateInteriorCount} interior camera
          {privacy.privateInteriorCount === 1 ? '' : 's'} private until client shares or alarm/panic unlocks.
        </p>
      )}
      {privacy?.interiorUnlocked && privacy.interiorCameraCount > 0 && (
        <p className="text-muted" style={{ margin: '0.5rem 0 0' }}>
          {privacy.unlockLabel}
        </p>
      )}

      {ctx.cameras.length > 0 && (
        <div className="camera-grid" style={{ marginTop: '0.75rem' }}>
          {ctx.cameras.map((c) => (
            <div key={c.id} className={`camera-tile ${c.privacyLocked ? 'camera-tile--locked' : ''}`}>
              <div
                className={`camera-tile__feed camera-tile__feed--${c.status.toLowerCase()} ${
                  c.privacyLocked ? 'camera-tile__feed--privacy' : ''
                }`}
              >
                <span className="camera-tile__live">
                  {c.privacyLocked ? 'PRIVATE' : `CH ${c.channel}`}
                </span>
                {c.isInterior && !c.privacyLocked && (
                  <span className="camera-tile__badge">Interior</span>
                )}
                <span className="camera-tile__name">{c.name}</span>
              </div>
              <span className="camera-tile__meta">
                {c.locationLabel}
                {c.privacyLocked ? '' : ` · ${c.status}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {ctx.events.length > 0 && (
        <ul className="status-list" style={{ marginTop: '0.75rem' }}>
          {ctx.events.slice(0, 4).map((e) => (
            <li key={e.id} className="status-list-item">
              <span>{e.title}</span>
              <span className="text-muted">{e.status.replace(/_/g, ' ')}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
