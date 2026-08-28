import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function MedicalLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="open-portal"
      label="Loading medical dispatch…"
      hints={[
        'Syncing the ambulance queue.',
        'System updates underway…',
        'Checking crew availability.',
      ]}
    />
  );
}
