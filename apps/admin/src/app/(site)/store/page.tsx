import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import StoreClient from './StoreClient';

export default function StorePage() {
  return (
    <Suspense
      fallback={
        <section className="nx-section">
          <LoadingSpinner label="Loading shop…" />
        </section>
      }
    >
      <StoreClient />
    </Suspense>
  );
}
