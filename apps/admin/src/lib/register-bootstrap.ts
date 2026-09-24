import { clientApi } from '@/lib/api-client';
import type { ClientRegisterCompletePayload } from '@/lib/auth';

/**
 * After invite registration succeeds, create optional protection assets
 * the user entered in the wizard (demo + real API where endpoints exist).
 */
export async function bootstrapRegistrationAssets(
  payload: Pick<
    ClientRegisterCompletePayload,
    'property' | 'vehicle' | 'familyMembers' | 'safeZones'
  >,
): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (payload.property?.name?.trim() && payload.property.address?.trim()) {
    tasks.push(
      clientApi.post('/client/properties/register', {
        name: payload.property.name.trim(),
        address: payload.property.address.trim(),
        gateCode: payload.property.gateCode?.trim() || undefined,
      }),
    );
  }

  if (payload.vehicle?.registration?.trim() && payload.vehicle.make?.trim() && payload.vehicle.model?.trim()) {
    tasks.push(
      clientApi.post('/client/vehicles', {
        registration: payload.vehicle.registration.trim().toUpperCase(),
        make: payload.vehicle.make.trim(),
        model: payload.vehicle.model.trim(),
        year: payload.vehicle.year,
        colour: payload.vehicle.colour?.trim() || undefined,
        color: payload.vehicle.colour?.trim() || undefined,
      }),
    );
  }

  for (const member of payload.familyMembers ?? []) {
    if (!member.firstName.trim() || !member.lastName.trim() || !member.email.trim()) continue;
    tasks.push(
      clientApi.post('/client/family/members', {
        firstName: member.firstName.trim(),
        lastName: member.lastName.trim(),
        email: member.email.trim().toLowerCase(),
        phone: member.phone?.trim() || undefined,
        relationship: member.relationship.trim() || 'Other relative',
      }),
    );
  }

  for (const zone of payload.safeZones ?? []) {
    if (!zone.name.trim()) continue;
    tasks.push(
      clientApi.post('/client/safe-zones', {
        name: zone.name.trim(),
        lat: zone.lat ?? -29.8587,
        lng: zone.lng ?? 31.0218,
        radiusM: zone.radiusM ?? 500,
      }),
    );
  }

  if (!tasks.length) return;
  await Promise.allSettled(tasks);
}
