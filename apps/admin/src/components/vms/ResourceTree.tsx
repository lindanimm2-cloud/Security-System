'use client';

import { useMemo, useState } from 'react';
import type { VmsCamera, VmsSiteNode, VmsTree } from '@/lib/vms/types';

export const VMS_CAMERA_DRAG_TYPE = 'application/x-vms-camera';

type ResourceTreeProps = {
  tree: VmsTree | null;
  /** Checked cameras (multi-select mode). */
  checked?: string[];
  onCheck?: (cameraIds: string[]) => void;
  /** Highlighted camera, e.g. the one in the active pane. */
  activeId?: string | null;
  onOpen?: (camera: VmsCamera) => void;
  draggable?: boolean;
  groups?: Array<VmsSiteNode['group']>;
  siteFilter?: string | null;
  title?: string;
  className?: string;
};

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === 'OFFLINE' || s === 'FAULT') return 'off';
  if (s === 'RECORDING') return 'rec';
  return 'on';
}

export function ResourceTree({
  tree,
  checked,
  onCheck,
  activeId,
  onOpen,
  draggable = false,
  groups = ['SITE', 'VEHICLE'],
  siteFilter,
  title = 'Monitoring points',
  className = '',
}: ResourceTreeProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const checkedSet = useMemo(() => new Set(checked ?? []), [checked]);
  const multi = Boolean(onCheck);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sites = (tree?.sites ?? []).filter(
      (s) => groups.includes(s.group) && (!siteFilter || s.id === siteFilter),
    );
    return groups
      .map((group) => ({
        group,
        label: group === 'SITE' ? 'Sites' : 'Vehicles',
        sites: sites
          .filter((s) => s.group === group)
          .map((site) => ({
            ...site,
            recorders: site.recorders
              .map((rec) => ({
                ...rec,
                cameras: rec.cameras.filter(
                  (c) =>
                    !q ||
                    `${c.name} ${c.locationLabel} ${site.name} ${rec.name}`.toLowerCase().includes(q),
                ),
              }))
              .filter((rec) => rec.cameras.length > 0),
          }))
          .filter((site) => site.recorders.length > 0),
      }))
      .filter((section) => section.sites.length > 0);
  }, [tree, groups, siteFilter, query]);

  function toggle(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setChecked(ids: string[], on: boolean) {
    if (!onCheck) return;
    const next = new Set(checkedSet);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    onCheck(Array.from(next));
  }

  return (
    <div className={`vms-tree ${className}`}>
      <div className="vms-tree__head">
        <strong>{title}</strong>
        {multi && checkedSet.size > 0 ? (
          <button type="button" className="vms-link" onClick={() => onCheck?.([])}>
            Clear {checkedSet.size}
          </button>
        ) : null}
      </div>
      <input
        type="search"
        className="vms-tree__search"
        value={query}
        placeholder="Enter keywords"
        aria-label="Search cameras"
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="vms-tree__body" role="tree" aria-label={title}>
        {sections.length === 0 ? <p className="vms-muted vms-tree__empty">No cameras match.</p> : null}
        {sections.map((section) => (
          <div key={section.group} className="vms-tree__section">
            <p className="vms-tree__section-label">{section.label}</p>
            {section.sites.map((site) => {
              const siteCams = site.recorders.flatMap((r) => r.cameras);
              const siteOpen = !collapsed[site.id];
              const allOn = siteCams.every((c) => checkedSet.has(c.id));
              const online = siteCams.filter((c) => statusTone(c.status) !== 'off').length;
              return (
                <div key={site.id} className="vms-tree__node" role="treeitem" aria-expanded={siteOpen}>
                  <div className="vms-tree__row vms-tree__row--site">
                    <button
                      type="button"
                      className="vms-tree__twisty"
                      onClick={() => toggle(site.id)}
                      aria-label={siteOpen ? `Collapse ${site.name}` : `Expand ${site.name}`}
                    >
                      {siteOpen ? '−' : '+'}
                    </button>
                    {multi ? (
                      <input
                        type="checkbox"
                        checked={allOn}
                        aria-label={`Select all cameras at ${site.name}`}
                        onChange={(e) => setChecked(siteCams.map((c) => c.id), e.target.checked)}
                      />
                    ) : null}
                    <span className="vms-tree__label" title={site.address}>
                      {site.name}
                    </span>
                    <span className="vms-tree__count">
                      {online}/{siteCams.length}
                    </span>
                  </div>
                  {siteOpen
                    ? site.recorders.map((rec) => {
                        const recKey = `${site.id}:${rec.id}`;
                        const recOpen = !collapsed[recKey];
                        return (
                          <div key={rec.id} className="vms-tree__node vms-tree__node--rec">
                            <div className="vms-tree__row vms-tree__row--rec">
                              <button
                                type="button"
                                className="vms-tree__twisty"
                                onClick={() => toggle(recKey)}
                                aria-label={recOpen ? `Collapse ${rec.name}` : `Expand ${rec.name}`}
                              >
                                {recOpen ? '−' : '+'}
                              </button>
                              <span className={`vms-dot vms-dot--${statusTone(rec.status)}`} aria-hidden />
                              <span className="vms-tree__label">
                                {rec.kind} · {rec.name}
                              </span>
                            </div>
                            {recOpen
                              ? rec.cameras.map((cam) => (
                                  <div
                                    key={cam.id}
                                    className={`vms-tree__row vms-tree__row--cam ${activeId === cam.id ? 'is-active' : ''}`}
                                    draggable={draggable}
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData(VMS_CAMERA_DRAG_TYPE, cam.id);
                                      e.dataTransfer.setData('text/plain', cam.id);
                                      e.dataTransfer.effectAllowed = 'copy';
                                    }}
                                    onDoubleClick={() => onOpen?.(cam)}
                                  >
                                    {multi ? (
                                      <input
                                        type="checkbox"
                                        checked={checkedSet.has(cam.id)}
                                        aria-label={`Select ${cam.name}`}
                                        onChange={(e) => setChecked([cam.id], e.target.checked)}
                                      />
                                    ) : null}
                                    <button
                                      type="button"
                                      className="vms-tree__cam"
                                      onClick={() => onOpen?.(cam)}
                                      title={`${cam.name} · Ch${cam.channel} · ${cam.status}`}
                                    >
                                      <span className={`vms-dot vms-dot--${statusTone(cam.status)}`} aria-hidden />
                                      <span className="vms-tree__label">
                                        {cam.name}
                                        {cam.isInterior ? <em> · interior</em> : null}
                                      </span>
                                      <span className="vms-tree__ch">Ch{cam.channel}</span>
                                    </button>
                                  </div>
                                ))
                              : null}
                          </div>
                        );
                      })
                    : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
