'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AccessMap } from '@/lib/subscription-plans';
import {
  PORTAL_PERMISSION_DEFS,
  type PortalPermissionKind,
  type PortalPermissionState,
  permissionAppliesToPlan,
} from '@/lib/portal-permissions';

export type PortalPermissionRow = {
  id: PortalPermissionKind;
  label: string;
  description: string;
  features: string;
  state: PortalPermissionState;
};

async function queryPermission(kind: PortalPermissionKind): Promise<PortalPermissionState> {
  if (typeof window === 'undefined') return 'checking';

  try {
    if (kind === 'notifications') {
      if (!('Notification' in window)) return 'unsupported';
      const p = Notification.permission;
      if (p === 'granted') return 'granted';
      if (p === 'denied') return 'denied';
      return 'prompt';
    }

    if (!navigator.permissions?.query) {
      if (kind === 'location' && !navigator.geolocation) return 'unsupported';
      if ((kind === 'microphone' || kind === 'camera') && !navigator.mediaDevices?.getUserMedia) {
        return 'unsupported';
      }
      return 'prompt';
    }

    const name =
      kind === 'location'
        ? 'geolocation'
        : kind === 'microphone'
          ? 'microphone'
          : kind === 'camera'
            ? 'camera'
            : null;

    if (!name) return 'unsupported';

    const status = await navigator.permissions.query({ name: name as PermissionName });
    if (status.state === 'granted') return 'granted';
    if (status.state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'prompt';
  }
}

async function requestPermission(kind: PortalPermissionKind): Promise<PortalPermissionState> {
  if (kind === 'notifications') {
    if (!('Notification' in window)) return 'unsupported';
    const result = await Notification.requestPermission();
    if (result === 'granted') return 'granted';
    if (result === 'denied') return 'denied';
    return 'prompt';
  }

  if (kind === 'location') {
    if (!navigator.geolocation) return 'unsupported';
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (err) => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'prompt'),
        { timeout: 12000, maximumAge: 0 },
      );
    });
  }

  if (kind === 'microphone' || kind === 'camera') {
    if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: kind === 'microphone',
        video: kind === 'camera',
      });
      stream.getTracks().forEach((t) => t.stop());
      return 'granted';
    } catch {
      return 'denied';
    }
  }

  return 'unsupported';
}

export function usePortalPermissions(access: AccessMap | null) {
  const [states, setStates] = useState<Record<PortalPermissionKind, PortalPermissionState>>({
    location: 'checking',
    notifications: 'checking',
    microphone: 'checking',
    camera: 'checking',
  });
  const [requesting, setRequesting] = useState<PortalPermissionKind | null>(null);

  const applicable = useMemo(
    () => PORTAL_PERMISSION_DEFS.filter((def) => permissionAppliesToPlan(def, access)),
    [access],
  );

  const refresh = useCallback(async () => {
    if (!access) return;
    const next: Partial<Record<PortalPermissionKind, PortalPermissionState>> = {};
    await Promise.all(
      applicable.map(async (def) => {
        next[def.id] = await queryPermission(def.id);
      }),
    );
    setStates((prev) => ({ ...prev, ...next }));
  }, [access, applicable]);

  useEffect(() => {
    if (!access) return;
    let cancelled = false;

    async function load() {
      const next: Partial<Record<PortalPermissionKind, PortalPermissionState>> = {};
      for (const def of applicable) {
        next[def.id] = await queryPermission(def.id);
      }
      if (!cancelled) {
        setStates((prev) => ({ ...prev, ...next }));
      }
    }

    void load();

    function onVisible() {
      if (document.visibilityState === 'visible') void load();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [access, applicable]);

  const rows: PortalPermissionRow[] = useMemo(
    () =>
      applicable.map((def) => ({
        id: def.id,
        label: def.label,
        description: def.description,
        features: def.features,
        state: states[def.id] ?? 'checking',
      })),
    [applicable, states],
  );

  const missing = rows.filter((r) => r.state === 'prompt' || r.state === 'denied');
  const allGranted = rows.length > 0 && missing.length === 0;

  async function allow(id: PortalPermissionKind) {
    setRequesting(id);
    try {
      const next = await requestPermission(id);
      setStates((prev) => ({ ...prev, [id]: next }));
      return next;
    } finally {
      setRequesting(null);
    }
  }

  async function allowAll() {
    for (const row of missing) {
      const result = await allow(row.id);
      if (result !== 'granted') break;
    }
  }

  return {
    rows,
    missing,
    allGranted,
    requesting,
    allow,
    allowAll,
    refresh,
  };
}
