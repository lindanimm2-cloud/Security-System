import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function ControlRoomLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      label="Loading control room…"
      hint="Syncing incidents, map, and dispatch."
    />
  );
}