import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function OfficerLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="open-portal"
      label="Loading officer app…"
      hints={[
        'Syncing assignments and status.',
        'System updates underway…',
        'Checking your shift queue.',
      ]}
    />
  );
}
