import { redirect } from 'next/navigation';

export default async function OrganizationIdIndex({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  redirect(`/org/${organizationId}/dashboard`);
}
