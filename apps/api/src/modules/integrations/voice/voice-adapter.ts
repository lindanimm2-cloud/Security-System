import type { VoiceCommandEvent, VoicePlatform } from '../events';

export type VoiceAdapterContext = {
  tenantId?: string;
  userId?: string;
  authorization?: string | null;
};

/** Platform-specific webhook → canonical VOICE_COMMAND. */
export interface VoiceAdapter {
  readonly platform: VoicePlatform;
  normalize(
    payload: Record<string, unknown>,
    ctx?: VoiceAdapterContext,
  ): Promise<VoiceCommandEvent | null> | VoiceCommandEvent | null;
}
