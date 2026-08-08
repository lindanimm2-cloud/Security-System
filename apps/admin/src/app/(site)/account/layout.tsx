import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account',
  description:
    '4DS Nexus client account — sign in with your protection portal credentials.',
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
