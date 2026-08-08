'use client';

import { LoadingSpinner } from './LoadingSpinner';

export function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return <LoadingSpinner label={label} fullScreen />;
}
