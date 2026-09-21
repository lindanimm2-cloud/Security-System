import type { CrashPlatform, VehicleCrashDetectedEvent } from '../events';

export type CrashAdapterContext = {
  tenantId?: string;
  userId?: string;
  authorization?: string | null;
};

/** Platform-specific crash payload → canonical VEHICLE_CRASH_DETECTED. */
export interface CrashAdapter {
  readonly platform: CrashPlatform;
  normalize(
    payload: Record<string, unknown>,
    ctx?: CrashAdapterContext,
  ): Promise<VehicleCrashDetectedEvent | null> | VehicleCrashDetectedEvent | null;
}
