import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function OfficerMapLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="page"
      label="Loading navigation…"
      hints={['Finding your assignment.', 'System updates underway…']}
    />
  );
}
