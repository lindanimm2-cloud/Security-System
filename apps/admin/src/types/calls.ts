export type CallChannel = 'INTERNAL' | 'WHATSAPP' | 'DISPATCH_LINE' | 'EXTERNAL';
export type CallStatus = 'RINGING' | 'CONNECTED' | 'ON_HOLD' | 'ENDED' | 'MISSED' | 'DECLINED';

export type CallParticipant = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

export type CallNote = {
  id: string;
  content: string;
  noteType: string;
  authorName: string;
  createdAt: string;
};

export type CallSession = {
  id: string;
  channel: CallChannel;
  status: CallStatus;
  targetName: string;
  targetPhone: string | null;
  targetRole: string | null;
  targetUserId: string | null;
  incidentId: string | null;
  isMuted: boolean;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  createdAt: string;
  initiator: CallParticipant;
  target: CallParticipant | null;
  notes: CallNote[];
};

export type CallDirectory = {
  dispatchLine: { name: string; phone: string };
  officers: {
    officerId: string;
    userId: string | null;
    name: string;
    status: string;
    phone: string;
  }[];
  dispatchers: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    phone: string | null;
  }[];
  clients: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
  }[];
};

export type CallTarget = {
  name: string;
  phone?: string;
  userId?: string;
  role?: string;
  incidentId?: string;
};
