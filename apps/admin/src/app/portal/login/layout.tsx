import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Portal',
};

export default function PortalLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
