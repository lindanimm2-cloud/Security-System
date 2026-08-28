import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function SupervisorMapLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="page"
      label="Loading officer map…"
      hints={['Plotting units.', 'System updates underway…']}
    />
  );
}
