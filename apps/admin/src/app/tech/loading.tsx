import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function TechLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      label="Loading technician desk…"
      hint="Loading your install queue."
    />
  );
}
