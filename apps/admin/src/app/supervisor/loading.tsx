import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function SupervisorLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="open-portal"
      label="Loading supervisor desk…"
      hints={[
        'Syncing patrols and performance.',
        'System updates underway…',
        'Checking shift coverage.',
      ]}
    />
  );
}
