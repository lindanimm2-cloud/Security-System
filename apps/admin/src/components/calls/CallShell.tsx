'use client';

import { CallMiniPlayer } from './CallMiniPlayer';
import { CallProvider } from './CallProvider';
import { CctvMiniPlayer } from '@/components/cctv/CctvMiniPlayer';

export function CallShell({ children }: { children: React.ReactNode }) {
  return (
    <CallProvider>
      {children}
      <CallMiniPlayer />
      <CctvMiniPlayer />
    </CallProvider>
  );
}
