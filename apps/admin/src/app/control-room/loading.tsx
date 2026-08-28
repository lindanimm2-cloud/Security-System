import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function ControlRoomLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="open-portal"
      label="Loading control room…"
      hints={[
        'Syncing incidents, map, and dispatch.',
        'System updates underway…',
        'Pulling live ops data…',
      ]}
    />
  );
}
