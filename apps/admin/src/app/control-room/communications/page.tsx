'use client';

import { useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { CallActions, DispatchLineButton } from '@/components/calls/CallActions';
import { channelLabel, formatCallHistoryMeta } from '@/lib/call-utils';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import type { CallDirectory, CallSession } from '@/types/calls';

export default function CommunicationsPage() {
  const [tab, setTab] = useState<'directory' | 'history'>('directory');
  const { data: directory, loading: dirLoading } = useApi(
    () => adminApi.get<ApiResponse<CallDirectory>>('/calls/directory'),
    [],
  );
  const { data: history, loading: histLoading, reload } = useApi(
    () => adminApi.get<ApiResponse<CallSession[]>>('/calls/history'),
    [],
  );

  const dir = directory?.data;
  const calls = history?.data ?? [];

  return (
    <ControlRoomLayout title="Communications">
      <div className="page-content">
        <header className="page-header">
          <div>
            <h2>Communications hub</h2>
            <p>
              Internal app calls, WhatsApp, dispatch line, and phone — with live notes via the call
              lens while you work anywhere in the control panel.
            </p>
          </div>
          {dir && <DispatchLineButton phone={dir.dispatchLine.phone} name={dir.dispatchLine.name} />}
        </header>

        <div className="call-hub-tabs">
          <button
            type="button"
            className={`call-hub-tab ${tab === 'directory' ? 'call-hub-tab--active' : ''}`}
            onClick={() => setTab('directory')}
          >
            Directory
          </button>
          <button
            type="button"
            className={`call-hub-tab ${tab === 'history' ? 'call-hub-tab--active' : ''}`}
            onClick={() => {
              setTab('history');
              reload();
            }}
          >
            Call history
          </button>
        </div>

        {tab === 'directory' && (
          <div className="call-hub-grid">
            {dirLoading && <p className="muted">Loading directory…</p>}
            {dir && (
              <>
                <section className="panel">
                  <h3>Officers</h3>
                  <div className="call-hub-list">
                    {dir.officers.map((o) => (
                      <div key={o.officerId} className="call-hub-row">
                        <div>
                          <strong>{o.name}</strong>
                          <span className="muted">{o.status.replace('_', ' ')} · {o.phone}</span>
                        </div>
                        <CallActions
                          compact
                          target={{
                            name: o.name,
                            phone: o.phone,
                            userId: o.userId ?? undefined,
                            role: 'OFFICER',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="panel">
                  <h3>Dispatch team</h3>
                  <div className="call-hub-list">
                    {dir.dispatchers.map((d) => (
                      <div key={d.id} className="call-hub-row">
                        <div>
                          <strong>
                            {d.firstName} {d.lastName}
                          </strong>
                          <span className="muted">{d.role} · {d.phone ?? 'No phone'}</span>
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

                <section className="panel call-hub-grid__wide">
                  <h3>Clients</h3>
                  <div className="call-hub-list">
                    {dir.clients.map((c) => (
                      <div key={c.id} className="call-hub-row">
                        <div>
                          <strong>
                            {c.firstName} {c.lastName}
                          </strong>
                          <span className="muted">{c.phone ?? 'No phone on file'}</span>
                        </div>
                        <CallActions
                          compact
                          target={{
                            name: `${c.firstName} ${c.lastName}`,
                            phone: c.phone ?? undefined,
                            userId: c.id,
                            role: 'CLIENT',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {tab === 'history' && (
          <section className="panel">
            {histLoading && <p className="muted">Loading history…</p>}
            {!histLoading && calls.length === 0 && (
              <p className="muted">No calls logged yet.</p>
            )}
            <div className="call-hub-list">
              {calls.map((call) => {
                const historyMeta = formatCallHistoryMeta(call.channel, call.durationSec);
                return (
                <div key={call.id} className="call-hub-row call-hub-row--history">
                  <div>
                    <strong>{call.targetName}</strong>
                    <span className="muted">
                      {channelLabel(call.channel)} · {call.status}
                      {historyMeta && ` · ${historyMeta}`}
                      {' · '}
                      {new Date(call.createdAt).toLocaleString('en-ZA')}
                    </span>
                    {call.notes.length > 0 && (
                      <p className="call-hub-note-preview">{call.notes[call.notes.length - 1].content}</p>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          </section>
        )}
      </div>
    </ControlRoomLayout>
  );
}
