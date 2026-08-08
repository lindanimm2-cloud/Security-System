import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Control Panel',
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
