'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CctvLiveFeed } from '@/components/portal/CctvLiveFeed';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import type { ArcMonitoringFile } from '@/lib/arc-desk';
import { VMS_ALARM_POLL_EVENT } from '@/lib/vms/api';
import { LEVEL_META, alarmTypeLabel, formatDateTime, playbackHref, type AlarmFeedItem } from '@/lib/vms/types';

const SEEN_KEY = 'vms.alarmPopup.seen';
const POLL_MS = 8_000;
/** Alarms older than this when the console opens are left to the alarm board. */
const FRESH_WINDOW_MS = 90_000;

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(window.sessionStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  try {
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen).slice(-200)));
  } catch {
    /* ignore */
  }
}

/** Camera alarm popup: live video of linked cameras when a rule with "Popup window" fires. */
export function AlarmVideoPopup() {
  const pathname = usePathname();
  const suppressed = pathname === '/control-room';
  const [queue, setQueue] = useState<AlarmFeedItem[]>([]);
  const [camIndex, setCamIndex] = useState(0);
  const [timer, setTimer] = useState<{ eventId: string | null; left: number }>({ eventId: null, left: 0 });
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [contacts, setContacts] = useState<ArcMonitoringFile['contacts']>([]);
  const mountedAt = useRef(Date.now());
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    seenRef.current = readSeen();
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await adminApi.get<ApiResponse<AlarmFeedItem[]>>('/control-room/vms/alarm-feed');
      const cutoff = mountedAt.current - FRESH_WINDOW_MS;
      const fresh = (res.data ?? []).filter(
        (item) =>
          item.cameras.length > 0 &&
          !seenRef.current.has(item.eventId) &&
          new Date(item.triggeredAt).getTime() >= cutoff,
      );
      if (!fresh.length) return;
      setQueue((prev) => {
        const known = new Set(prev.map((p) => p.eventId));
        const add = fresh.filter((f) => !known.has(f.eventId));
        return add.length ? [...prev, ...add].sort((a, b) => a.level - b.level) : prev;
      });
    } catch {
      /* transient; next poll retries */
    }
  }, []);

  useEffect(() => {
    if (suppressed) return;
    void poll();
    const onPoll = () => void poll();
    window.addEventListener(VMS_ALARM_POLL_EVENT, onPoll);
    const id = window.setInterval(onPoll, POLL_MS);
    return () => {
      window.removeEventListener(VMS_ALARM_POLL_EVENT, onPoll);
      window.clearInterval(id);
    };
  }, [poll, suppressed]);

  const current = queue[0] ?? null;

  const dismiss = useCallback(() => {
    if (!current) return;
    seenRef.current.add(current.eventId);
    writeSeen(seenRef.current);
    setQueue((prev) => prev.slice(1));
    setCamIndex(0);
    setContacts([]);
  }, [current]);

  useEffect(() => {
    if (current) setTimer({ eventId: current.eventId, left: current.popupSeconds });
  }, [current]);

  useEffect(() => {
    if (!current?.siteId) {
      setContacts([]);
      return;
    }
    let cancelled = false;
    setContacts([]);
    void adminApi
      .get<ApiResponse<ArcMonitoringFile>>(`/control-room/sites/${current.siteId}/monitoring-file`)
      .then((res) => {
        if (!cancelled) setContacts((res.data?.contacts ?? []).slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [current?.siteId, current?.eventId]);

  useEffect(() => {
    if (!current || hover || timer.eventId !== current.eventId) return;
    if (timer.left <= 0) {
      dismiss();
      return;
    }
    const id = window.setTimeout(() => setTimer((t) => ({ ...t, left: t.left - 1 })), 1000);
    return () => window.clearTimeout(id);
  }, [current, timer, hover, dismiss]);
  const remaining = current && timer.eventId === current.eventId ? timer.left : current?.popupSeconds ?? 0;

  async function acknowledge() {
    if (!current) return;
    setBusy(true);
    try {
      await adminApi.post('/control-room/alarm-history/ack', { ids: [current.eventId], remark: 'Acknowledged from video popup' });
    } catch {
      /* the board still shows it; dismiss locally */
    } finally {
      setBusy(false);
      dismiss();
    }
  }

  if (suppressed || !current) return null;

  const cam = current.cameras[Math.min(camIndex, current.cameras.length - 1)];
  const at = new Date(new Date(current.triggeredAt).getTime() - 10_000).toISOString();

  return (
    <aside
      className="vms-alarm-pop"
      role="alertdialog"
      aria-live="assertive"
      aria-label={`Camera alarm: ${current.title}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <header className="vms-alarm-pop__head">
        <span className={`vms-level vms-level--${LEVEL_META[current.level]?.tone ?? 'l3'}`} title={LEVEL_META[current.level]?.label}>
          {current.level}
        </span>
        <strong>{alarmTypeLabel(current.type)}</strong>
        <span className="vms-muted">{hover ? 'paused' : `${remaining}s`}</span>
        <button type="button" onClick={dismiss} aria-label="Dismiss alarm popup">
          ×
        </button>
      </header>
      <div className="vms-alarm-pop__video">
        <CctvLiveFeed camera={cam} compact onSelect={() => undefined} />
      </div>
      {current.cameras.length > 1 ? (
        <div className="vms-chips" style={{ padding: '8px 10px 0' }}>
          {current.cameras.map((c, i) => (
            <button key={c.id} type="button" className={`vms-chip ${i === camIndex ? 'is-on' : ''}`} onClick={() => setCamIndex(i)}>
              {c.name}
            </button>
          ))}
        </div>
      ) : null}
      <dl className="vms-alarm-pop__meta">
        <dt>Site</dt>
        <dd>{current.siteName}</dd>
        <dt>Camera</dt>
        <dd>{cam.name}</dd>
        <dt>Time</dt>
        <dd>{formatDateTime(current.triggeredAt)}</dd>
        <dt>Event</dt>
        <dd>{current.title}</dd>
      </dl>
      {contacts.length > 0 ? (
        <div className="vms-alarm-pop__contacts" aria-label="Site contacts">
          <strong>Contacts</strong>
          <ul>
            {contacts.map((c, idx) => {
              const phone = (c.phone ?? '').replace(/[^\d+]/g, '');
              return (
                <li key={`${c.name}-${idx}`}>
                  <div>
                    <span className="vms-alarm-pop__contact-name">{c.name}</span>
                    <span className="vms-muted">{c.relationship || 'Contact'}</span>
                  </div>
                  {phone ? (
                    <span className="vms-alarm-pop__contact-actions">
                      <a href={`tel:${phone}`}>Call</a>
                      <a href={`sms:${phone}`}>Text</a>
                    </span>
                  ) : (
                    <span className="vms-muted">No phone</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <footer className="vms-alarm-pop__foot">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void acknowledge()}>
          Acknowledge
        </button>
        <Link
          href={playbackHref({ cameraIds: current.cameras.map((c) => c.id), at, siteId: current.siteId })}
          className="btn btn-ghost btn-sm"
          onClick={dismiss}
        >
          Playback at alarm time
        </Link>
        {queue.length > 1 ? <span className="vms-alarm-pop__queue">+{queue.length - 1} more</span> : null}
      </footer>
    </aside>
  );
}
