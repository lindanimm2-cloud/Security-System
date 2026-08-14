import { LoginForm } from '@/components/LoginForm';

export default function MedicalLoginPage() {
  return (
    <LoginForm
      portal="admin"
      title="Medical dispatch"
      subtitle="Sign in for the medical queue and ambulance board."
      redirectTo="/medical"
      defaultEmail="medical@4ds.local"
      demoEmail="medical@4ds.local"
    />
  );
}
