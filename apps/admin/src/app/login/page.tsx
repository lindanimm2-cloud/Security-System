import { LoginForm } from '@/components/LoginForm';

export default function AdminLoginPage() {
  return (
    <LoginForm
      portal="admin"
      title="Welcome back"
      subtitle="Sign in to manage incidents, dispatch, and live operations."
      redirectTo="/control-room"
    />
  );
}
