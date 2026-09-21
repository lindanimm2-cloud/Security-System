import type {
  AccessAdapterId,
  AccessCommandType,
  AccessPointKind,
  AccessPointState,
} from '../physical-control.types';

export type AccessAdapterContext = {
  tenantId?: string;
  accessPointId?: string;
};

export type NormalizedAccessCommand = {
  command: AccessCommandType;
  externalRef?: string | null;
  /** Milliseconds simulated until ACK / MOVING / SUCCEEDED for stub adapters. */
  latencyMs?: { ack?: number; moving?: number; done?: number };
};

export interface AccessControlAdapter {
  readonly id: AccessAdapterId;
  /** Send command to controller; returns false if device unreachable. */
  sendCommand(
    payload: {
      accessPointId: string;
      kind: AccessPointKind;
      currentState: AccessPointState;
      command: AccessCommandType;
      externalRef?: string | null;
    },
    ctx?: AccessAdapterContext,
  ): Promise<{ accepted: boolean; message?: string }>;
}

export function createGenericAccessAdapter(id: AccessAdapterId = 'generic'): AccessControlAdapter {
  return {
    id,
    async sendCommand(payload) {
      if (payload.currentState === 'OFFLINE') {
        return { accepted: false, message: 'Controller offline' };
      }
      return { accepted: true, message: `Command ${payload.command} accepted by ${id}` };
    },
  };
}

export const genericAccessAdapter = createGenericAccessAdapter('generic');
export const onvifProfileCAdapter = createGenericAccessAdapter('onvif-profile-c');
export const hidAccessAdapter = createGenericAccessAdapter('hid');
export const gallagherAccessAdapter = createGenericAccessAdapter('gallagher');
export const demoAccessAdapter = createGenericAccessAdapter('demo');
