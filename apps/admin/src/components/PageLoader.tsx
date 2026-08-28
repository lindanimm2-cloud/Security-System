'use client';

import { LoadingSpinner } from './LoadingSpinner';

export function PageLoader({
  label = 'Loading this page…',
  hint,
}: {
  label?: string;
  hint?: string;
}) {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="page"
      label={label}
      hint={hint}
      hints={
        hint
          ? undefined
          : [
              'System updates underway…',
              'Pulling live ops data…',
              'Checking connections…',
            ]
      }
    />
  );
}
