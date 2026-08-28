import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function ControlRoomMapLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="page"
      label="Loading live map…"
      hints={['Plotting units and incidents.', 'System updates underway…']}
    />
  );
}
