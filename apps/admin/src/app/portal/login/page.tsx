'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';

function PortalLoginInner() {
  const params = useSearchParams();
  const reason = params.get('reason');
  const subtitle =
    reason === 'site-session'
      ? 'Website sign-in does not open the protection portal. Sign in here to continue.'
      : 'Sign in to access your protection dashboard.';

  return (
    <LoginForm
      portal="client"
      title="Welcome back"
      subtitle={subtitle}
      redirectTo="/portal"
    />
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading…" fullScreen />}>
      <PortalLoginInner />
    </Suspense>
  );
}
