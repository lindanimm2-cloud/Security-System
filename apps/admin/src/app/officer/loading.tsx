import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function OfficerLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      label="Loading officer app…"
      hint="Syncing assignments and status."
    />
  );
}
