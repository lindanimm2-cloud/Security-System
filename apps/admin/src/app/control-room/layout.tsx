import type { Metadata } from 'next';
import '../ops-control.css';
import '../ops-stage-light.css';
import '../vms.css';
import '../settings-hub-desk.css';

export const metadata: Metadata = {
  title: 'Control Panel',
  description: '4DS Security control room — live cameras, events, and operations status',
};

export default function ControlRoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
