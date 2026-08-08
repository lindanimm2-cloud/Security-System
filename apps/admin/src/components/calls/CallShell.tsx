'use client';

import { CallMiniPlayer } from './CallMiniPlayer';
import { CallProvider } from './CallProvider';

export function CallShell({ children }: { children: React.ReactNode }) {
  return (
    <CallProvider>
      {children}
      <CallMiniPlayer />
    </CallProvider>
  );
}
