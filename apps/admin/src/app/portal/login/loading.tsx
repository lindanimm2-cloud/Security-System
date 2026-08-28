import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function PortalLoginLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="page"
      label="Preparing sign-in…"
      hints={[
        'Opening the client portal login.',
        'System updates underway…',
        'Securing this session.',
      ]}
    />
  );
}
