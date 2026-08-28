import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function PortalLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="open-portal"
      label="Loading client portal…"
      hints={[
        'Pulling protection status and alerts.',
        'System updates underway…',
        'Checking your cover.',
      ]}
    />
  );
}
