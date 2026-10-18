import { redirect } from 'next/navigation';

/** Assurance desk removed — security posture lives under Device security. */
export default function AssurancePage() {
  redirect('/control-room/device-security');
}
