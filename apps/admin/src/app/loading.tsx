import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function Loading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      label="Loading Nexus…"
      hint="Preparing your workspace."
    />
  );
}
