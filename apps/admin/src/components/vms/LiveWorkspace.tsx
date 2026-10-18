'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CctvLiveFeed } from '@/components/portal/CctvLiveFeed';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import { flattenCameras, playbackHref, type VmsCamera, type VmsTree } from '@/lib/vms/types';
import { ResourceTree } from './ResourceTree';
import { LayoutPicker, VmsGrid, type VmsLayout } from './VmsGrid';

const LAYOUT_KEY = 'vms.live.layout';
const PANES_KEY = 'vms.live.panes';
const SAVED_KEY = 'vms.live.saved';

type StreamProfile = 'main' | 'sub';
type SavedView = { name: string; layout: VmsLayout; panes: Array<string | null> };

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked */
  }
}

export function LiveWorkspace({ tree, initialSiteId }: { tree: VmsTree; initialSiteId?: string | null }) {
  const cameras = useMemo(() => flattenCameras(tree), [tree]);
  const byId = useMemo(() => new Map(cameras.map((c) => [c.id, c])), [cameras]);
  const vehicleSiteIds = useMemo(
    () => new Set(tree.sites.filter((s) => s.group === 'VEHICLE').map((s) => s.id)),
    [tree],
  );

  const [layout, setLayout] = useState<VmsLayout>(4);
  const [panes, setPanes] = useState<Array<string | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [streams, setStreams] = useState<Record<string, StreamProfile>>({});
  const [saved, setSaved] = useState<SavedView[]>([]);
  const [savedName, setSavedName] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedLayout = readJson<VmsLayout | null>(LAYOUT_KEY, null);
    const storedPanes = readJson<Array<string | null> | null>(PANES_KEY, null);
    setSaved(readJson<SavedView[]>(SAVED_KEY, []));
    const site = initialSiteId ? tree.sites.find((s) => s.id === initialSiteId) : null;
    if (site) {
      const ids = site.recorders.flatMap((r) => r.cameras.map((c) => c.id));
      const nextLayout: VmsLayout = ids.length <= 1 ? 1 : ids.length <= 4 ? 4 : ids.length <= 9 ? 9 : 16;
      setLayout(nextLayout);
      setPanes(ids.slice(0, nextLayout));
      return;
    }
    if (storedLayout) setLayout(storedLayout);
    if (storedPanes && storedPanes.some((id) => id && byId.has(id))) {
      setPanes(storedPanes.map((id) => (id && byId.has(id) ? id : null)));
    } else {
      setPanes(cameras.slice(0, storedLayout ?? 4).map((c) => c.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree]);

  useEffect(() => {
    if (panes.length) writeJson(PANES_KEY, panes);
  }, [panes]);

  const changeLayout = useCallback((next: VmsLayout) => {
    setLayout(next);
    writeJson(LAYOUT_KEY, next);
    setActiveIndex((i) => Math.min(i, next - 1));
  }, []);

  const paneCams: Array<VmsCamera | null> = useMemo(
    () => Array.from({ length: layout }, (_, i) => (panes[i] ? byId.get(panes[i] as string) ?? null : null)),
    [layout, panes, byId],
  );

  function placeCamera(index: number, cameraId: string) {
    setPanes((prev) => {
      const next = [...prev];
      while (next.length < 16) next.push(null);
      const existing = next.indexOf(cameraId);
      if (existing >= 0 && existing !== index) next[existing] = next[index] ?? null;
      next[index] = cameraId;
      return next;
    });
  }

  function openCamera(cam: VmsCamera) {
    placeCamera(activeIndex, cam.id);
    const nextEmpty = paneCams.findIndex((c, i) => i > activeIndex && !c);
    if (nextEmpty >= 0) setActiveIndex(nextEmpty);
  }

  function clearPane(index: number) {
    setPanes((prev) => prev.map((id, i) => (i === index ? null : id)));
  }

  function saveView() {
    const name = savedName.trim() || `View ${saved.length + 1}`;
    const next = [...saved.filter((v) => v.name !== name), { name, layout, panes: panes.slice(0, layout) }];
    setSaved(next);
    writeJson(SAVED_KEY, next);
    setSavedName('');
  }

  function loadView(name: string) {
    const view = saved.find((v) => v.name === name);
    if (!view) return;
    changeLayout(view.layout);
    setPanes(view.panes);
    setActiveIndex(0);
  }

  function deleteView(name: string) {
    const next = saved.filter((v) => v.name !== name);
    setSaved(next);
    writeJson(SAVED_KEY, next);
  }

  function fullscreen() {
    const el = gridRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  const active = paneCams[activeIndex] ?? null;
  const activeStream: StreamProfile = active ? streams[active.id] ?? (layout >= 9 ? 'sub' : 'main') : 'main';
  const visibleIds = paneCams.filter(Boolean).map((c) => (c as VmsCamera).id);
  const offline = cameras.filter((c) => c.status.toUpperCase() === 'OFFLINE').length;

  return (
    <div className="vms-work">
      <ResourceTree tree={tree} activeId={active?.id} onOpen={openCamera} draggable className="vms-work__tree" />

      <section className="vms-work__main" aria-label="Live view">
        <div className="vms-toolbar">
          <LayoutPicker value={layout} onChange={changeLayout} />
          <div className="vms-seg vms-seg--sm" role="radiogroup" aria-label="Stream for active window">
            {(['main', 'sub'] as StreamProfile[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={activeStream === s}
                className={activeStream === s ? 'is-on' : ''}
                disabled={!active}
                onClick={() => active && setStreams((prev) => ({ ...prev, [active.id]: s }))}
              >
                {s === 'main' ? 'Main stream' : 'Sub stream'}
              </button>
            ))}
          </div>
          <span className="vms-toolbar__spacer" />
          <span className="vms-muted">
            {cameras.length - offline}/{cameras.length} online
          </span>
          <Link
            href={playbackHref({ cameraIds: visibleIds.slice(0, 9) })}
            className={`btn btn-ghost btn-sm ${visibleIds.length ? '' : 'is-disabled'}`}
            aria-disabled={!visibleIds.length}
          >
            Playback visible
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanes([])}>
            Clear all
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={fullscreen}>
            Full screen
          </button>
        </div>

        <div ref={gridRef} className="vms-work__grid">
          <VmsGrid
            layout={layout}
            panes={paneCams}
            activeIndex={activeIndex}
            onActivate={setActiveIndex}
            onDropCamera={placeCamera}
            onClear={clearPane}
            renderPane={(cam) => {
              const stream = streams[cam.id] ?? (layout >= 9 ? 'sub' : 'main');
              return (
                <>
                  <CctvLiveFeed camera={cam} compact={layout >= 9} showControls={layout <= 4} onSelect={() => undefined} />
                  <span className="vms-pane__tag">
                    {cam.siteName} · {stream === 'main' ? 'Main' : 'Sub'}
                  </span>
                </>
              );
            }}
          />
        </div>
      </section>

      <aside className="vms-work__side" aria-label="Window details">
        <section className="vms-card">
          <h3>Active window</h3>
          {active ? (
            <dl className="vms-dl">
              <dt>Camera</dt>
              <dd>{active.name}</dd>
              <dt>Location</dt>
              <dd>{active.locationLabel || '—'}</dd>
              <dt>Site</dt>
              <dd>{active.siteName}</dd>
              <dt>Channel</dt>
              <dd>Ch{active.channel}</dd>
              <dt>Status</dt>
              <dd>{active.status}</dd>
              <dt>Stream</dt>
              <dd>{activeStream === 'main' ? 'Main (high quality)' : 'Sub (low bandwidth)'}</dd>
            </dl>
          ) : (
            <p className="vms-muted">Select a window, then double-click a camera in the tree.</p>
          )}
          {active ? (
            <div className="vms-actions">
              <Link href={playbackHref({ cameraIds: [active.id], siteId: active.siteId })} className="btn btn-primary btn-sm">
                Playback
              </Link>
              {!vehicleSiteIds.has(active.siteId) ? (
                <Link href={`${CONTROL_ROOM_ROUTES.surveillance}/${active.siteId}`} className="btn btn-ghost btn-sm">
                  Open site
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="vms-card">
          <h3>Saved views</h3>
          <div className="vms-inline-form">
            <input
              value={savedName}
              onChange={(e) => setSavedName(e.target.value)}
              placeholder="View name"
              aria-label="View name"
              maxLength={40}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={saveView}>
              Save
            </button>
          </div>
          {saved.length === 0 ? (
            <p className="vms-muted">Save the current layout to reopen it later on this workstation.</p>
          ) : (
            <ul className="vms-list">
              {saved.map((v) => (
                <li key={v.name}>
                  <button type="button" className="vms-link" onClick={() => loadView(v.name)}>
                    {v.name}
                  </button>
                  <span className="vms-muted">{v.layout} win</span>
                  <button
                    type="button"
                    className="vms-icon-btn vms-icon-btn--sm"
                    aria-label={`Delete ${v.name}`}
                    onClick={() => deleteView(v.name)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
