'use client';

import { useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { ClientChatHub } from '@/components/control-room/ClientChatHub';
import { CallActions, DispatchLineButton } from '@/components/calls/CallActions';
import { PropertyCommandPanel } from '@/components/access/PropertyCommandPanel';
import { IntercomStationPanel } from '@/components/access/IntercomStationPanel';
import { ParkingTicketAssist } from '@/components/access/ParkingTicketAssist';
import { channelLabel, formatCallHistoryMeta } from '@/lib/call-utils';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import type { CallDirectory, CallSession } from '@/types/calls';
import { ListSearch } from '@/components/ui/ListSearch';
import { matchesSearch } from '@/lib/list-search';
import { UiSelect } from '@/components/ui/UiSelect';

type HubTab = 'gates' | 'intercoms' | 'chat';
type ChatTab = 'client-chat' | 'directory' | 'history';

const PROPERTY_OPTIONS = [
  { value: 'all', label: 'All sites' },
  { value: 'demo-prop-1', label: 'Home — Umhlanga' },
  { value: 'demo-prop-4', label: 'Mall — Gateway' },
  { value: 'demo-prop-2', label: 'Apartment' },
  { value: 'demo-prop-3', label: 'Warehouse' },
];

export default function CommunicationsPage() {
  const [hubTab, setHubTab] = useState<HubTab>('gates');
  const [chatTab, setChatTab] = useState<ChatTab>('client-chat');
  const [propertyId, setPropertyId] = useState('all');
  const [search, setSearch] = useState('');

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
  const scopedPropertyId = propertyId === 'all' ? undefined : propertyId;

  const filteredOfficers = useMemo(
    () =>
      (dir?.officers ?? []).filter((o) =>
        matchesSearch(search, o.name, o.phone, o.status, 'OFFICER'),
      ),
    [dir?.officers, search],
  );
  const filteredDispatchers = useMemo(
    () =>
      (dir?.dispatchers ?? []).filter((d) =>
        matchesSearch(search, d.firstName, d.lastName, d.phone, d.role),
      ),
    [dir?.dispatchers, search],
  );
  const filteredClients = useMemo(
    () =>
      (dir?.clients ?? []).filter((c) =>
        matchesSearch(search, c.firstName, c.lastName, c.phone, c.role),
      ),
    [dir?.clients, search],
  );
  const filteredCalls = useMemo(
    () =>
      calls.filter((call) =>
        matchesSearch(
          search,
          call.targetName,
          call.targetPhone,
          call.targetRole,
          call.channel,
          call.status,
          channelLabel(call.channel),
        ),
      ),
    [calls, search],
  );

  const dirTotal =
    (dir?.officers.length ?? 0) + (dir?.dispatchers.length ?? 0) + (dir?.clients.length ?? 0);
  const dirFiltered =
    filteredOfficers.length + filteredDispatchers.length + filteredClients.length;

  return (
    <ControlRoomLayout title="Gates & Comms">
      <div className="page-content ops-page gates-comms-page">
        <header className="ops-page-header ops-page-header--compact">
          <div>
            <h1 className="ops-page-header__title">Gates &amp; Comms</h1>
            <p className="ops-page-header__subtitle">
              Remote boom / gate control, door intercoms, and client communications
            </p>
          </div>
          <div className="ops-page-header__actions">
            {dir ? <DispatchLineButton phone={dir.dispatchLine.phone} name={dir.dispatchLine.name} /> : null}
          </div>
        </header>

        <div className="gates-comms-tabs" role="tablist" aria-label="Gates and communications">
          {(
            [
              ['gates', 'Gates'],
              ['intercoms', 'Intercoms'],
              ['chat', 'Chat'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={hubTab === id}
              className={`gates-comms-tabs__btn ${hubTab === id ? 'is-active' : ''}`}
              onClick={() => setHubTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {hubTab === 'gates' ? (
          <div className="gates-comms-stack">
            <div className="ops-toolbar ops-toolbar--compact">
              <UiSelect
                compact
                ariaLabel="Filter by site"
                value={propertyId}
                onChange={setPropertyId}
                options={PROPERTY_OPTIONS}
              />
            </div>
            <div className="prop-cmd-wrap">
              <PropertyCommandPanel
                mode="control-room"
                propertyId={scopedPropertyId}
                allowEmergency
              />
            </div>
            {propertyId === 'all' || propertyId === 'demo-prop-4' ? (
              <ParkingTicketAssist mode="control-room" defaultAccessPointId="ap-mall-park-exit" />
            ) : null}
          </div>
        ) : null}

        {hubTab === 'intercoms' ? (
          <IntercomStationPanel mode="control-room" propertyId={scopedPropertyId} />
        ) : null}

        {hubTab === 'chat' ? (
          <>
            <div className="call-hub-tabs">
              <button
                type="button"
                className={`call-hub-tab ${chatTab === 'client-chat' ? 'call-hub-tab--active' : ''}`}
                onClick={() => setChatTab('client-chat')}
              >
                Client chat
              </button>
              <button
                type="button"
                className={`call-hub-tab ${chatTab === 'directory' ? 'call-hub-tab--active' : ''}`}
                onClick={() => setChatTab('directory')}
              >
                Directory
              </button>
              <button
                type="button"
                className={`call-hub-tab ${chatTab === 'history' ? 'call-hub-tab--active' : ''}`}
                onClick={() => {
                  setChatTab('history');
                  reload();
                }}
              >
                Call history
              </button>
            </div>

            {chatTab === 'client-chat' ? (
              <section className="panel client-chat-hub-panel">
                <ClientChatHub />
              </section>
            ) : null}

            {chatTab === 'directory' ? (
              <>
                <div className="list-search-bar">
                  <ListSearch
                    value={search}
                    onChange={setSearch}
                    placeholder="Search name, phone, role…"
                    resultCount={dirFiltered}
                    totalCount={dirTotal}
                    id="comms-directory-search"
                  />
                </div>
                <div className="call-hub-grid">
                  {dirLoading ? <p className="muted">Loading directory…</p> : null}
                  {dir ? (
                    <>
                      <section className="panel">
                        <h3>Officers</h3>
                        <div className="call-hub-list">
                          {filteredOfficers.length === 0 ? (
                            <p className="muted">{search.trim() ? 'No matches.' : 'No officers.'}</p>
                          ) : (
                            filteredOfficers.map((o) => (
                              <div key={o.officerId} className="call-hub-row">
                                <div>
                                  <strong>{o.name}</strong>
                                  <span className="muted">
                                    {o.status.replace('_', ' ')} · {o.phone}
                                  </span>
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
                            ))
                          )}
                        </div>
                      </section>

                      <section className="panel">
                        <h3>Dispatch team</h3>
                        <div className="call-hub-list">
                          {filteredDispatchers.length === 0 ? (
                            <p className="muted">{search.trim() ? 'No matches.' : 'No dispatchers.'}</p>
                          ) : (
                            filteredDispatchers.map((d) => (
                              <div key={d.id} className="call-hub-row">
                                <div>
                                  <strong>
                                    {d.firstName} {d.lastName}
                                  </strong>
                                  <span className="muted">
                                    {d.role} · {d.phone ?? 'No phone'}
                                  </span>
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
                            ))
                          )}
                        </div>
                      </section>

                      <section className="panel call-hub-grid__wide">
                        <h3>Clients</h3>
                        <div className="call-hub-list">
                          {filteredClients.length === 0 ? (
                            <p className="muted">{search.trim() ? 'No matches.' : 'No clients.'}</p>
                          ) : (
                            filteredClients.map((c) => (
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
                            ))
                          )}
                        </div>
                      </section>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}

            {chatTab === 'history' ? (
              <section className="panel">
                <div className="list-search-bar">
                  <ListSearch
                    value={search}
                    onChange={setSearch}
                    placeholder="Search name, phone, channel…"
                    resultCount={filteredCalls.length}
                    totalCount={calls.length}
                    id="comms-history-search"
                  />
                </div>
                {histLoading ? <p className="muted">Loading history…</p> : null}
                {!histLoading && filteredCalls.length === 0 ? (
                  <p className="muted">{search.trim() ? 'No matching calls.' : 'No calls logged yet.'}</p>
                ) : null}
                <div className="call-hub-list">
                  {filteredCalls.map((call) => {
                    const historyMeta = formatCallHistoryMeta(call.channel, call.durationSec);
                    return (
                      <div key={call.id} className="call-hub-row call-hub-row--history">
                        <div>
                          <strong>{call.targetName}</strong>
                          <span className="muted">
                            {channelLabel(call.channel)} · {call.status}
                            {historyMeta ? ` · ${historyMeta}` : ''}
                            {' · '}
                            {new Date(call.createdAt).toLocaleString('en-ZA')}
                          </span>
                          {call.notes.length > 0 ? (
                            <p className="call-hub-note-preview">
                              {call.notes[call.notes.length - 1].content}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </ControlRoomLayout>
  );
}
