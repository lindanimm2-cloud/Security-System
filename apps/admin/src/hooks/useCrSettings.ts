'use client';

import { useEffect, useState } from 'react';
import {
  CR_SETTINGS_CHANGED_EVENT,
  loadCrSettings,
  type CrSettings,
} from '@/lib/control-room-settings';

export function useCrSettings(): CrSettings {
  const [settings, setSettings] = useState<CrSettings>(() => loadCrSettings());

  useEffect(() => {
    function sync() {
      setSettings(loadCrSettings());
    }
    window.addEventListener(CR_SETTINGS_CHANGED_EVENT, sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener(CR_SETTINGS_CHANGED_EVENT, sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  return settings;
}
