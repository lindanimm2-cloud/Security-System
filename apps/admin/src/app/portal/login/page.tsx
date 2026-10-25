'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { shouldShowPortalWelcome } from '@/lib/temp-engagements';

function PortalLoginInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const reason = params.get('reason');
  const subtitle =
    reason === 'site-session'
      ? 'Website sign-in does not open the protection portal. Sign in here to continue.'
      : 'Sign in to access your protection dashboard — including escort and protection jobs.';

  useEffect(() => {
    if (shouldShowPortalWelcome()) {
      router.replace('/portal/welcome');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return <LoadingSpinner label="Loading…" fullScreen />;
  }

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
