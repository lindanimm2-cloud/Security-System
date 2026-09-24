import { OrgLayout } from '@/components/org/OrgLayout';

export default async function OrganizationIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  return <OrgLayout organizationId={organizationId}>{children}</OrgLayout>;
}
