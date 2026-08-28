import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function TechLoginLoading() {
  return (
    <LoadingSpinner
      brand
      fullScreen
      action="page"
      label="Preparing technician sign-in…"
      hints={[
        'Opening the install desk login.',
        'System updates underway…',
        'Securing this session.',
      ]}
    />
  );
}
