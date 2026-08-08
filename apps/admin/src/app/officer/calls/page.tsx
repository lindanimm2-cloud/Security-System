'use client';

import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { CallActions, DispatchLineButton } from '@/components/calls/CallActions';
import { channelLabel, formatCallHistoryMeta } from '@/lib/call-utils';
import { useApi } from '@/hooks/useApi';
import { officerApi, type ApiResponse } from '@/lib/api-client';
import type { CallDirectory, CallSession } from '@/types/calls';

export default function OfficerCallsPage() {
  const { data: directory, loading: dirLoading } = useApi(
    () => officerApi.get<ApiResponse<CallDirectory>>('/calls/directory'),
    [],
  );
  const { data: history, loading: histLoading } = useApi(
    () => officerApi.get<ApiResponse<CallSession[]>>('/calls/history'),
    [],
  );

  const dir = directory?.data;
  const calls = history?.data ?? [];

  return (
    <OfficerLayout title="Calls">
      <div className="page-content">
        <header className="page-header">
          <div>
            <h2>Field communications</h2>
            <p>Call control room, clients, or team members. Notes stay in the call lens while you navigate.</p>
          </div>
          {dir && <DispatchLineButton phone={dir.dispatchLine.phone} name={dir.dispatchLine.name} />}
        </header>

        {dirLoading && <p className="muted">Loading…</p>}
        {dir && (
          <div className="call-hub-grid">
            <section className="portal-card">
              <h3>Dispatch team</h3>
              <div className="call-hub-list">
                {dir.dispatchers.map((d) => (
                  <div key={d.id} className="call-hub-row">
                    <div>
                      <strong>{d.firstName} {d.lastName}</strong>
                      <span className="muted">{d.role}</span>
                    </div>
                    <CallActions
                      compact
                      target={{
                        name: `${d.firstName} ${d.lastName}`,
                        phone: d.phone ?? undefined,
                        userId: d.id,
                        role: d.role,
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="portal-card call-hub-grid__wide">
              <h3>Recent calls</h3>
              {histLoading && <p className="muted">Loading history…</p>}
              <div className="call-hub-list">
                {calls.slice(0, 15).map((call) => (
                  <div key={call.id} className="call-hub-row call-hub-row--history">
                    <div>
                      <strong>{call.targetName}</strong>
                      <span className="muted">
                        {channelLabel(call.channel)} · {call.status}
                        {formatCallHistoryMeta(call.channel, call.durationSec) &&
                          ` · ${formatCallHistoryMeta(call.channel, call.durationSec)}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </OfficerLayout>
  );
}
