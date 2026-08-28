import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function OfficerLoginLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="page"
      label="Preparing officer sign-in…"
      hints={[
        'Opening the field app login.',
        'System updates underway…',
        'Securing this session.',
      ]}
    />
  );
}
