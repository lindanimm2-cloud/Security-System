import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function MedicalLoginLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="page"
      label="Preparing medical sign-in…"
      hints={[
        'Opening dispatch login.',
        'System updates underway…',
        'Securing this session.',
      ]}
    />
  );
}
