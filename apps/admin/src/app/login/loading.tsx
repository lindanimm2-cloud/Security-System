import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function LoginLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="page"
      label="Preparing sign-in…"
      hints={[
        'Securing this session.',
        'System updates underway…',
        'Loading the login screen.',
      ]}
    />
  );
}
