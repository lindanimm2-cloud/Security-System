'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AiPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/portal/emergency');
  }, [router]);
  return null;
}
