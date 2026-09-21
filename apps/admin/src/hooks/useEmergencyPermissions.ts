'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AccessMap } from '@/lib/subscription-plans';
import {
  EMERGENCY_PERMISSION_DEFS,
  EMERGENCY_SETUP_DONE_KEY,
  emergencyPermissionApplies,
  type EmergencyPermissionDef,
  type EmergencyPermissionId,
  type EmergencyPermissionState,
} from '@/lib/emergency-permissions';
import {
  loadHapticPrefs,
  saveHapticPrefs,
  vibrationSupported,
  type EmergencyHapticPrefs,
} from '@/lib/emergency-vibration';
import { ensureEmergencyServiceWorker, requestClientPushPermission } from '@/lib/client-push';

export type EmergencyPermissionRow = EmergencyPermissionDef & {
  state: EmergencyPermissionState;
};

async function queryOsPermission(id: EmergencyPermissionId): Promise<EmergencyPermissionState> {
  if (typeof window === 'undefined') return 'checking';
  const prefs = loadHapticPrefs();

  try {
    if (id === 'notifications') {
      if (!('Notification' in window)) return 'unsupported';
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      return 'prompt';
    }

    if (id === 'alert_sound') {
      return prefs.soundEnabled ? 'granted' : 'prompt';
    }

    if (id === 'vibration') {
      if (!vibrationSupported()) return 'unsupported';
      return prefs.vibrationEnabled ? 'granted' : 'prompt';
    }

    if (id === 'phone') {
      return prefs.phoneCallsEnabled ? 'granted' : 'prompt';
    }

    if (id === 'contacts') {
      // Contacts Picker is rare; treat as preference + optional picker.
      if ('contacts' in navigator && 'ContactsManager' in window) {
        try {
          const status = await navigator.permissions.query({
            name: 'contacts' as PermissionName,
          });
          if (status.state === 'granted') return 'granted';
          if (status.state === 'denied') return 'denied';
        } catch {
          /* fall through */
        }
      }
      return prefs.contactsPickerEnabled ? 'granted' : 'prompt';
    }

    if (id === 'bluetooth') {
      if (!('bluetooth' in navigator)) return 'unsupported';
      return prefs.bluetoothEnabled ? 'granted' : 'prompt';
    }

    if (id === 'background') {
      const notifOk = 'Notification' in window && Notification.permission === 'granted';
      const swOk = 'serviceWorker' in navigator;
      if (notifOk && swOk && prefs.backgroundEnabled) return 'granted';
      if (!swOk) return 'unsupported';
      return 'prompt';
    }

    if (id === 'sos') {
      return 'unsupported';
    }

    if (!navigator.permissions?.query) {
      if (id === 'location' && !navigator.geolocation) return 'unsupported';
      if ((id === 'microphone' || id === 'camera') && !navigator.mediaDevices?.getUserMedia) {
        return 'unsupported';
      }
      return 'prompt';
    }

    const name =
      id === 'location'
        ? 'geolocation'
        : id === 'microphone'
          ? 'microphone'
          : id === 'camera'
            ? 'camera'
            : null;
    if (!name) return 'prompt';

    const status = await navigator.permissions.query({ name: name as PermissionName });
    if (status.state === 'granted') return 'granted';
    if (status.state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'prompt';
  }
}

async function requestOsPermission(id: EmergencyPermissionId): Promise<EmergencyPermissionState> {
  if (id === 'notifications') {
    const result = await requestClientPushPermission();
    if (result === 'unsupported') return 'unsupported';
    if (result === 'granted') {
      await ensureEmergencyServiceWorker();
      return 'granted';
    }
    if (result === 'denied') return 'denied';
    return 'prompt';
  }

  if (id === 'alert_sound') {
    saveHapticPrefs({ soundEnabled: true });
    // Unlock audio on user gesture
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        await ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.01);
        void ctx.close();
      }
    } catch {
      /* ignore */
    }
    return 'granted';
  }

  if (id === 'vibration') {
    if (!vibrationSupported()) return 'unsupported';
    saveHapticPrefs({ vibrationEnabled: true });
    try {
      navigator.vibrate?.([80, 40, 80]);
    } catch {
      /* ignore */
    }
    return 'granted';
  }

  if (id === 'phone') {
    saveHapticPrefs({ phoneCallsEnabled: true });
    return 'granted';
  }

  if (id === 'contacts') {
    saveHapticPrefs({ contactsPickerEnabled: true });
    return 'granted';
  }

  if (id === 'bluetooth') {
    if (!('bluetooth' in navigator)) return 'unsupported';
    saveHapticPrefs({ bluetoothEnabled: true });
    return 'granted';
  }

  if (id === 'background') {
    await requestClientPushPermission();
    await ensureEmergencyServiceWorker();
    saveHapticPrefs({ backgroundEnabled: true });
    if ('Notification' in window && Notification.permission === 'granted') return 'granted';
    if ('Notification' in window && Notification.permission === 'denied') return 'denied';
    return 'prompt';
  }

  if (id === 'sos') return 'unsupported';

  if (id === 'location') {
    if (!navigator.geolocation) return 'unsupported';
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (err) => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'prompt'),
        { timeout: 12000, maximumAge: 0 },
      );
    });
  }

  if (id === 'microphone' || id === 'camera') {
    if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: id === 'microphone',
        video: id === 'camera',
      });
      stream.getTracks().forEach((t) => t.stop());
      return 'granted';
    } catch {
      return 'denied';
    }
  }

  return 'unsupported';
}

function emptyStates(): Record<EmergencyPermissionId, EmergencyPermissionState> {
  return {
    notifications: 'checking',
    alert_sound: 'checking',
    vibration: 'checking',
    location: 'checking',
    phone: 'checking',
    microphone: 'checking',
    camera: 'checking',
    contacts: 'checking',
    bluetooth: 'checking',
    background: 'checking',
    sos: 'checking',
  };
}

export function useEmergencyPermissions(access: AccessMap | null) {
  const [states, setStates] = useState(emptyStates);
  const [prefs, setPrefs] = useState<EmergencyHapticPrefs>(() => loadHapticPrefs());
  const [requesting, setRequesting] = useState<EmergencyPermissionId | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);

  const applicable = useMemo(
    () => EMERGENCY_PERMISSION_DEFS.filter((def) => emergencyPermissionApplies(def, access)),
    [access],
  );

  const refresh = useCallback(async () => {
    if (!access) return;
    const next = emptyStates();
    await Promise.all(
      applicable.map(async (def) => {
        next[def.id] = await queryOsPermission(def.id);
      }),
    );
    setStates(next);
    setPrefs(loadHapticPrefs());
  }, [access, applicable]);

  useEffect(() => {
    if (!access) return;
    let cancelled = false;
    void (async () => {
      const next = emptyStates();
      for (const def of applicable) {
        next[def.id] = await queryOsPermission(def.id);
      }
      if (!cancelled) {
        setStates(next);
        setPrefs(loadHapticPrefs());
      }
    })();
    function onVisible() {
      if (document.visibilityState === 'visible') void refresh();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [access, applicable, refresh]);

  const rows: EmergencyPermissionRow[] = useMemo(
    () =>
      applicable.map((def) => ({
        ...def,
        state: states[def.id] ?? 'checking',
      })),
    [applicable, states],
  );

  const recommended = rows.filter((r) => r.recommended);
  const optional = rows.filter((r) => !r.recommended);
  const missing = rows.filter(
    (r) => r.state === 'prompt' || r.state === 'denied' || r.state === 'recommended',
  );
  const missingRequired = recommended.filter(
    (r) => r.required && (r.state === 'prompt' || r.state === 'denied'),
  );

  async function allow(id: EmergencyPermissionId) {
    setRequesting(id);
    try {
      const next = await requestOsPermission(id);
      setStates((prev) => ({ ...prev, [id]: next }));
      setPrefs(loadHapticPrefs());
      return next;
    } finally {
      setRequesting(null);
    }
  }

  async function allowRecommended() {
    setSetupBusy(true);
    try {
      for (const row of recommended) {
        if (row.state === 'granted' || row.state === 'unsupported') continue;
        const result = await allow(row.id);
        if (result === 'denied' && row.required) break;
      }
      try {
        localStorage.setItem(EMERGENCY_SETUP_DONE_KEY, '1');
      } catch {
        /* ignore */
      }
      await refresh();
    } finally {
      setSetupBusy(false);
    }
  }

  function updatePrefs(patch: Partial<EmergencyHapticPrefs>) {
    const next = saveHapticPrefs(patch);
    setPrefs(next);
    void refresh();
    return next;
  }

  function isSetupDone() {
    try {
      return localStorage.getItem(EMERGENCY_SETUP_DONE_KEY) === '1';
    } catch {
      return false;
    }
  }

  return {
    rows,
    recommended,
    optional,
    missing,
    missingRequired,
    requesting,
    setupBusy,
    prefs,
    allow,
    allowRecommended,
    updatePrefs,
    refresh,
    isSetupDone,
  };
}
