'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { fetchVmsTree, VMS_ALARM_POLL_EVENT } from '@/lib/vms/api';
import {
  ALARM_TYPE_TREE,
  LEVEL_META,
  alarmTypeLabel,
  flattenCameras,
  type AlarmFeedItem,
  type AlarmVideoActions,
  type AlarmVideoRule,
  type VmsCamera,
} from '@/lib/vms/types';
import { ResourceTree } from './ResourceTree';

type Draft = Pick<AlarmVideoRule, 'cameraId' | 'alarmType' | 'enabled' | 'level' | 'actions'> & { id?: string };

function defaultActions(cameraId: string): AlarmVideoActions {
  return {
    popup: true,
    popupSeconds: 30,
    linkedCameraIds: [cameraId],
    record: true,
    presetNo: null,
    alarmOutput: null,
    email: false,
  };
}

/** Per-camera alarm types and linked trigger actions (popup, record, PTZ preset, outputs). */
export function AlarmRulesPanel() {
  const { data: treeRes } = useApi(() => fetchVmsTree(), []);
  const tree = treeRes?.data ?? null;
  const cameras = useMemo(() => flattenCameras(tree), [tree]);
  const camById = useMemo(() => new Map(cameras.map((c) => [c.id, c])), [cameras]);

  const { data: rulesRes, reload } = useApi(
    () => adminApi.get<ApiResponse<AlarmVideoRule[]>>('/control-room/vms/alarm-rules'),
    [],
  );
  const savedRules = useMemo(() => rulesRes?.data ?? [], [rulesRes]);

  const [cameraId, setCameraId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [focusType, setFocusType] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!cameraId && savedRules[0]) setCameraId(savedRules[0].cameraId);
    else if (!cameraId && cameras[0]) setCameraId(cameras[0].id);
  }, [cameraId, savedRules, cameras]);

  useEffect(() => {
    if (!cameraId) return;
    const next: Record<string, Draft> = {};
    for (const r of savedRules.filter((x) => x.cameraId === cameraId)) {
      next[r.alarmType] = { id: r.id, cameraId: r.cameraId, alarmType: r.alarmType, enabled: r.enabled, level: r.level, actions: { ...r.actions } };
    }
    setDrafts(next);
    setFocusType((prev) => (prev && next[prev] ? prev : Object.keys(next)[0] ?? null));
    setMsg(null);
  }, [cameraId, savedRules]);

  const camera = cameraId ? camById.get(cameraId) ?? null : null;
  const siteCams = camera ? cameras.filter((c) => c.siteId === camera.siteId) : [];
  const focus = focusType ? drafts[focusType] : null;
  const ruleCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of savedRules) if (r.enabled) map.set(r.cameraId, (map.get(r.cameraId) ?? 0) + 1);
    return map;
  }, [savedRules]);

  function toggleType(code: string, on: boolean) {
    if (!cameraId) return;
    setDrafts((prev) => {
      const existing = prev[code];
      if (existing) return { ...prev, [code]: { ...existing, enabled: on } };
      return { ...prev, [code]: { cameraId, alarmType: code, enabled: true, level: 3, actions: defaultActions(cameraId) } };
    });
    if (on) setFocusType(code);
  }

  function patchFocus(p: Partial<Draft>) {
    if (!focusType) return;
    setDrafts((prev) => ({ ...prev, [focusType]: { ...prev[focusType], ...p } }));
  }

  function patchActions(p: Partial<AlarmVideoActions>) {
    if (!focus) return;
    patchFocus({ actions: { ...focus.actions, ...p } });
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.put('/control-room/vms/alarm-rules', { rules: Object.values(drafts) });
      await reload({ silent: true });
      setMsg({ tone: 'ok', text: 'Alarm rules saved.' });
    } catch (err) {
      setMsg({ tone: 'err', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setBusy(false);
    }
  }

  async function test(draft: Draft) {
    if (!draft.id) {
      setMsg({ tone: 'err', text: 'Save the rule before testing it.' });
      return;
    }
    setMsg(null);
    try {
      const res = await adminApi.post<ApiResponse<AlarmFeedItem | null>>(`/control-room/vms/alarm-rules/${draft.id}/test`);
      window.dispatchEvent(new Event(VMS_ALARM_POLL_EVENT));
      setMsg({
        tone: 'ok',
        text: res.data
          ? `Test alarm raised — the video popup should appear now.`
          : 'Test alarm raised. Enable “Popup window” to see the video popup.',
      });
    } catch (err) {
      setMsg({ tone: 'err', text: err instanceof Error ? err.message : 'Test failed' });
    }
  }

  async function remove(draft: Draft) {
    if (draft.id) {
      try {
        await adminApi.delete(`/control-room/vms/alarm-rules/${draft.id}`);
        await reload({ silent: true });
      } catch (err) {
        setMsg({ tone: 'err', text: err instanceof Error ? err.message : 'Delete failed' });
        return;
      }
    } else {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[draft.alarmType];
        return next;
      });
    }
    setFocusType(null);
  }

  return (
    <section className="ops-panel vms-rules-wrap" aria-labelledby="vms-rules-title">
      <header className="vms-toolbar" style={{ background: 'transparent', padding: '0 0 10px', border: 0 }}>
        <div>
          <h2 id="vms-rules-title" className="ops-panel__title" style={{ margin: 0 }}>
            Camera alarm rules
          </h2>
          <span className="vms-muted">Pick a camera, tick the alarm types it should raise, then set what happens.</span>
        </div>
        <span className="vms-toolbar__spacer" />
        {tree?.demo ? <span className="vms-badge">Demo</span> : null}
      </header>
      <div className="vms-rules">
        <ResourceTree
          tree={tree}
          activeId={cameraId}
          onOpen={(c: VmsCamera) => setCameraId(c.id)}
          title="Cameras"
        />
        <div className="vms-rules__body">
          {!camera ? (
            <p className="vms-muted">Select a camera to configure its alarm types.</p>
          ) : (
            <>
              <div className="vms-toolbar" style={{ padding: 0, border: 0, background: 'transparent' }}>
                <strong>{camera.name}</strong>
                <span className="vms-muted">
                  {camera.siteName} · Ch{camera.channel}
                </span>
                {ruleCounts.get(camera.id) ? <span className="vms-pill">{ruleCounts.get(camera.id)} active</span> : null}
                <span className="vms-toolbar__spacer" />
                <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void save()}>
                  {busy ? 'Saving…' : 'Save rules'}
                </button>
              </div>
              {msg ? <p className={msg.tone === 'err' ? 'vms-error' : 'vms-ok'} role="status">{msg.text}</p> : null}

              <div className="vms-rules__types">
                {ALARM_TYPE_TREE.map((group) => (
                  <div key={group.group} className="vms-rules__group">
                    <h4>{group.group}</h4>
                    {group.types.map((t) => {
                      const d = drafts[t.code];
                      return (
                        <div key={t.code} className="vms-inline-form" style={{ alignItems: 'center' }}>
                          <label className="vms-check" style={{ flex: 1, color: d?.enabled ? 'var(--vms-text)' : undefined }}>
                            <input type="checkbox" checked={Boolean(d?.enabled)} onChange={(e) => toggleType(t.code, e.target.checked)} />
                            {t.label}
                          </label>
                          {d ? (
                            <button type="button" className={`vms-link ${focusType === t.code ? '' : 'vms-muted'}`} onClick={() => setFocusType(t.code)}>
                              {focusType === t.code ? 'Editing' : 'Actions'}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {focus ? (
                <div className="vms-card">
                  <div className="vms-toolbar" style={{ padding: 0, border: 0, background: 'transparent' }}>
                    <h3>Trigger actions · {alarmTypeLabel(focus.alarmType)}</h3>
                    <span className="vms-toolbar__spacer" />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void test(focus)}>
                      Test alarm
                    </button>
                    <button type="button" className="vms-link vms-link--danger" onClick={() => void remove(focus)}>
                      Remove
                    </button>
                  </div>
                  <div className="vms-form-grid">
                    <label className="vms-field">
                      <span>Alarm level</span>
                      <select value={focus.level} onChange={(e) => patchFocus({ level: Number(e.target.value) })}>
                        {[1, 2, 3, 4, 5].map((l) => (
                          <option key={l} value={l}>
                            {LEVEL_META[l].label}
                            {l === 1 ? ' (highest)' : l === 5 ? ' (lowest)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="vms-field">
                      <span>Popup duration (s)</span>
                      <input type="number" min={5} max={600} value={focus.actions.popupSeconds} disabled={!focus.actions.popup} onChange={(e) => patchActions({ popupSeconds: Number(e.target.value) })} />
                    </label>
                    <label className="vms-field">
                      <span>PTZ preset</span>
                      <input type="number" min={1} max={255} value={focus.actions.presetNo ?? ''} placeholder="None" onChange={(e) => patchActions({ presetNo: e.target.value ? Number(e.target.value) : null })} />
                    </label>
                    <label className="vms-field">
                      <span>Alarm output</span>
                      <select value={focus.actions.alarmOutput ?? ''} onChange={(e) => patchActions({ alarmOutput: e.target.value || null })}>
                        <option value="">None</option>
                        <option value="Siren relay 1">Siren relay 1</option>
                        <option value="Strobe relay 2">Strobe relay 2</option>
                        <option value="Gate lock output">Gate lock output</option>
                      </select>
                    </label>
                  </div>
                  <div className="vms-rules__actions">
                    <label className="vms-check">
                      <input type="checkbox" checked={focus.actions.popup} onChange={(e) => patchActions({ popup: e.target.checked })} />
                      Popup window with live video
                    </label>
                    <label className="vms-check">
                      <input type="checkbox" checked={focus.actions.record} onChange={(e) => patchActions({ record: e.target.checked })} />
                      Record linked cameras
                    </label>
                    <label className="vms-check">
                      <input type="checkbox" checked={focus.actions.email} onChange={(e) => patchActions({ email: e.target.checked })} />
                      Email supervisor
                    </label>
                  </div>
                  <div className="vms-field">
                    <span>Linked cameras (shown in popup and recorded)</span>
                    <div className="vms-chips">
                      {siteCams.map((c) => {
                        const on = focus.actions.linkedCameraIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className={`vms-chip ${on ? 'is-on' : ''}`}
                            aria-pressed={on}
                            onClick={() =>
                              patchActions({
                                linkedCameraIds: on
                                  ? focus.actions.linkedCameraIds.filter((x) => x !== c.id)
                                  : [...focus.actions.linkedCameraIds, c.id].slice(0, 4),
                              })
                            }
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="vms-muted">Tick an alarm type to configure its trigger actions.</p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
