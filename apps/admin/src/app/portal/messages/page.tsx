'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MessagesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/portal/family/chat');
  }, [router]);
  return null;
}
