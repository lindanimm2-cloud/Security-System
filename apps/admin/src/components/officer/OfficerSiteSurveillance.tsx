'use client';

import { IncidentTimeline } from '@/components/incident/IncidentTimeline';
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
  if (
    typeof ctx !== 'object' ||
    ctx === null ||
    Array.isArray(ctx) ||
    !('cameras' in ctx) ||
    !Array.isArray(ctx.cameras) ||
    !('events' in ctx) ||
    !Array.isArray(ctx.events)
  ) {
    return null;
  }
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
        <div className="officer-surveillance__summary">
          <div>
            <p className="officer-surveillance__title">
              <strong>{ctx.property.name}</strong>
            </p>
            <p className="text-muted officer-surveillance__address">{ctx.property.address}</p>
          </div>
          <div className="officer-surveillance__facts">
            {ctx.property.gateCode && (
              <div className="officer-surveillance__fact">
                <span>Gate</span>
                <strong>{ctx.property.gateCode}</strong>
              </div>
            )}
            {ctx.property.keyHolder && (
              <div className="officer-surveillance__fact">
                <span>Key holder</span>
                <strong>{ctx.property.keyHolder}</strong>
              </div>
            )}
          </div>
          {ctx.property.accessNotes && (
            <p className="text-muted officer-surveillance__notes">{ctx.property.accessNotes}</p>
          )}
        </div>
      )}

      {privacy && privacy.privateInteriorCount > 0 && !privacy.interiorUnlocked && (
        <p className="text-muted officer-surveillance__privacy-note">
          {privacy.privateInteriorCount} interior camera
          {privacy.privateInteriorCount === 1 ? '' : 's'} private until client shares or alarm/panic unlocks.
        </p>
      )}
      {privacy?.interiorUnlocked && privacy.interiorCameraCount > 0 && (
        <p className="text-muted officer-surveillance__privacy-note">
          {privacy.unlockLabel}
        </p>
      )}

      {ctx.cameras.length > 0 && (
        <div className="camera-grid officer-surveillance__grid">
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
        <IncidentTimeline
          compact
          items={ctx.events.slice(0, 4).map((e) => ({
            id: e.id,
            kind: 'event' as const,
            type: `${e.type}.${e.status}`.toLowerCase(),
            source: 'site',
            createdAt: e.triggeredAt,
            payload: { content: e.title },
          }))}
        />
      )}
    </section>
  );
}
