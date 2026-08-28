import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function Loading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="page"
      label="Loading Nexus…"
      hints={[
        'Preparing your workspace.',
        'System updates underway…',
        'Checking connections…',
      ]}
    />
  );
}
