import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function TechMapLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="page"
      label="Loading job map…"
      hints={['Finding today’s sites.', 'System updates underway…']}
    />
  );
}
