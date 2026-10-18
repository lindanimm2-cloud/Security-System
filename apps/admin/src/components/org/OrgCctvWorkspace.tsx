'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { OrgCamera, OrgCameraGroup } from '@/lib/org';
import { listOrgCameras } from '@/lib/org';
import { CameraFeed } from './CameraFeed';

const GROUPS: { id: OrgCameraGroup; label: string }[] = [
  { id: 'all', label: 'All cameras' },
  { id: 'entrances', label: 'Entrances' },
  { id: 'parking', label: 'Parking' },
  { id: 'perimeter', label: 'Perimeter' },
  { id: 'offices', label: 'Offices' },
  { id: 'retail', label: 'Retail' },
  { id: 'loading', label: 'Loading' },
  { id: 'critical', label: 'Critical' },
];

export function OrgCctvWorkspace({ organizationId }: { organizationId: string }) {
  const params = useSearchParams();
  const cameras = useMemo(() => listOrgCameras(organizationId), [organizationId]);
  const requested = params.get('camera');
  const [group, setGroup] = useState<OrgCameraGroup>('all');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(requested ?? cameras[0]?.id ?? '');
  const [note, setNote] = useState('Demo workspace. Nothing here talks to a camera.');

  const visible = cameras.filter((camera) => {
    const inGroup = group === 'all' || camera.group === group;
    const q = query.trim().toLowerCase();
    const matches = !q || `${camera.name} ${camera.location}`.toLowerCase().includes(q);
    return inGroup && matches;
  });
  const active: OrgCamera | undefined =
    cameras.find((c) => c.id === activeId) ?? visible[0] ?? cameras[0];

  function demoAction(label: string) {
    setNote(`${label} is a demo control. No device received a command.`);
  }

  return (
    <div className="cctv">
      <header className="cctv__bar">
        <div>
          <p className="soc-kicker">Surveillance workspace</p>
          <h1>CCTV</h1>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search camera"
          aria-label="Search camera"
        />
      </header>
      <div className="cctv__body">
        <aside className="cctv__list">
          <div className="cctv__groups">
            {GROUPS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={group === item.id ? 'is-on' : undefined}
                onClick={() => setGroup(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <p className="org-empty">No cameras in this group.</p>
          ) : (
            <ul>
              {visible.map((camera) => (
                <li key={camera.id}>
                  <button
                    type="button"
                    className={active?.id === camera.id ? 'is-on' : undefined}
                    onClick={() => setActiveId(camera.id)}
                  >
                    <i className={camera.status === 'ONLINE' ? 'is-ok' : 'is-bad'} />
                    <span>
                      <strong>{camera.name}</strong>
                      <em>{camera.location}</em>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section className="cctv__stage">
          {active ? (
            <>
              <CameraFeed
                camera={active}
                large
                href={`/org/${organizationId}/cctv?camera=${active.id}`}
              />
              <div className="cctv__tools">
                <span>
                  {active.status} · {active.quality} link
                  {active.ptz ? ' · PTZ capable' : ''}
                  {active.audio ? ' · audio capable' : ''}
                </span>
                <div>
                  <button type="button" onClick={() => demoAction('Snapshot')}>
                    Snapshot
                  </button>
                  <button type="button" onClick={() => demoAction('Record')}>
                    Record
                  </button>
                  <button type="button" onClick={() => demoAction('Fullscreen')}>
                    Fullscreen
                  </button>
                  <button type="button" onClick={() => demoAction('Report')}>
                    Report
                  </button>
                  <button type="button" disabled={!active.ptz} onClick={() => demoAction('PTZ')}>
                    PTZ
                  </button>
                </div>
              </div>
              <p className="soc-demo-note">{note}</p>
            </>
          ) : (
            <p className="org-empty">No cameras connected for this organization.</p>
          )}
        </section>
      </div>
    </div>
  );
}
