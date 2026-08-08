'use client';

import { isDemoMode } from '@/lib/demo/is-demo-mode';

export function DemoModeBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="demo-mode-banner" role="status">
      <strong>Pitch demo mode</strong>
      <span>
        Running on Vercel without a live API — seeded data · password{' '}
        <code>Demo123!</code> · tenant <code>demo</code>
      </span>
    </div>
  );
}
