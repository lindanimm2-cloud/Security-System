import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Organization Portal',
  description: '4DS Solutions organization security operations — malls, estates, companies, multi-site',
};

export default function OrgRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
