import { LoginForm } from '@/components/LoginForm';

export default function OfficerLoginPage() {
  return (
    <LoginForm
      portal="officer"
      title="Welcome back"
      subtitle="Sign in to your field operations dashboard."
      redirectTo="/officer"
      defaultEmail="ndlovu@4ds.local"
      demoEmail="ndlovu@4ds.local"
    />
  );
}
