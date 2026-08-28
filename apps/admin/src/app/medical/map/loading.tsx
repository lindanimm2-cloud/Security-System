import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function MedicalMapLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="page"
      label="Loading medical map…"
      hints={['Plotting ambulance units.', 'System updates underway…']}
    />
  );
}
