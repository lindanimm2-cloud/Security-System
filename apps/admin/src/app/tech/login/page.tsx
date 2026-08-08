import { LoginForm } from '@/components/LoginForm';

export default function TechLoginPage() {
  return (
    <LoginForm
      portal="technician"
      title="Technician sign-in"
      subtitle="Install team — CCTV, alarms, and access control jobs."
      redirectTo="/tech"
      defaultEmail="tech.cameras@4ds.local"
      demoEmail="tech.cameras@4ds.local"
    />
  );
}
