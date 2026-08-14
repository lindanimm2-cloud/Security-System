'use client';

import { useEffect } from 'react';
import { bootTabSession } from '@/lib/tab-session';

export function TabSessionBoot() {
  useEffect(() => {
    bootTabSession();
  }, []);
  return null;
}
