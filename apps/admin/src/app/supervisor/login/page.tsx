import { redirect } from 'next/navigation';

export default function SupervisorLoginRedirect() {
  redirect('/login');
}
