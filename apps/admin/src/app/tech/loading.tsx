import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function TechLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="open-portal"
      label="Loading technician desk…"
      hints={[
        'Loading your install queue.',
        'System updates underway…',
        'Checking job assignments.',
      ]}
    />
  );
}
