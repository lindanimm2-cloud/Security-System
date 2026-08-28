import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Control Panel',
  description:
    '4DS Solutions control panel — live ops board, map, dispatch, incidents, and analytics',
};

export default function ControlRoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
