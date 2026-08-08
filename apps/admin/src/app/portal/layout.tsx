import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Portal',
  description: '4DS Solutions client portal — emergency tools, family safety, and protection services',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
