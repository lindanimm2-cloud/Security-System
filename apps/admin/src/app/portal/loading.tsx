import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function PortalLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      label="Loading client portal…"
      hint="Pulling protection status and alerts."
    />
  );
}
