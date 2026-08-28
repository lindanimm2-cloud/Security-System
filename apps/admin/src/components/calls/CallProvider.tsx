'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { getSession, type AuthPortal } from '@/lib/auth';
import { getSocketUrl } from '@/lib/socket';
import { isExternalCallChannel, whatsappCallHref, telHref } from '@/lib/call-utils';
import type { ApiResponse } from '@/lib/api-client';
import { adminApi, clientApi, officerApi } from '@/lib/api-client';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import type { CallChannel, CallSession, CallTarget } from '@/types/calls';

type IncomingCall = CallSession & { recipientUserId?: string };

type CallContextValue = {
  portal: AuthPortal | null;
  activeCall: CallSession | null;
  incomingCall: IncomingCall | null;
  panelExpanded: boolean;
  setPanelExpanded: (open: boolean) => void;
  startCall: (channel: CallChannel, target: CallTarget) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleHold: () => Promise<void>;
  addNote: (content: string, noteType?: 'NOTE' | 'REPORT') => Promise<void>;
  elapsedSec: number;
};

const CallContext = createContext<CallContextValue | null>(null);

function apiForPortal(portal: AuthPortal) {
  if (portal === 'client') return clientApi;
  if (portal === 'officer') return officerApi;
  return adminApi;
}

function detectPortal(): AuthPortal | null {
  if (typeof window === 'undefined') return null;
  if (getSession('admin')) return 'admin';
  if (getSession('officer')) return 'officer';
  if (getSession('client')) return 'client';
  return null;
}

function isControlRoomIncoming(portal: AuthPortal | null, session: CallSession, me?: string) {
  if (!me || session.initiator.id === me) return false;
  if (session.status !== 'RINGING') return false;
  if (session.target?.id === me) return true;
  return portal === 'admin' && session.channel === 'DISPATCH_LINE';
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [portal, setPortal] = useState<AuthPortal | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const session = portal ? getSession(portal) : null;
  const userId = session?.user.id;

  const loadActive = useCallback(async (p: AuthPortal) => {
    try {
      const res = await apiForPortal(p).get<ApiResponse<CallSession | null>>('/calls/active');
      const session = res.data;
      const me = getSession(p)?.user.id;
      if (session && isControlRoomIncoming(p, session, me)) {
        setIncomingCall(session);
        setActiveCall(null);
        return;
      }
      if (session && ['RINGING', 'CONNECTED', 'ON_HOLD'].includes(session.status)) {
        setActiveCall(session);
        if (session.status !== 'RINGING') setIncomingCall(null);
      } else {
        setActiveCall(null);
      }
    } catch {
      /* not logged in */
    }
  }, []);

  useEffect(() => {
    const p = detectPortal();
    setPortal(p);
    if (p) void loadActive(p);
  }, [loadActive]);

  useEffect(() => {
    if (!portal) return;
    const currentPortal = portal;
    const id = shouldBackgroundPoll()
      ? window.setInterval(() => void loadActive(currentPortal), 4000)
      : null;
    function onDemoCall() {
      void loadActive(currentPortal);
    }
    window.addEventListener('4ds-demo-call', onDemoCall);
    window.addEventListener('storage', onDemoCall);
    return () => {
      window.clearInterval(id ?? undefined);
      window.removeEventListener('4ds-demo-call', onDemoCall);
      window.removeEventListener('storage', onDemoCall);
    };
  }, [portal, loadActive]);

  useEffect(() => {
    if (!portal || !session) return;
    const base = getSocketUrl();
    if (!base) return;

    const socket: Socket = io(`${base}/realtime`, {
      auth: { token: session.accessToken },
    });
    socketRef.current = socket;

    socket.on('call:incoming', (payload: IncomingCall) => {
      if (
        payload.recipientUserId === userId ||
        isControlRoomIncoming(portal, payload, userId)
      ) {
        setIncomingCall(payload);
      }
    });

    socket.on('call:started', (payload: CallSession) => {
      if (payload.initiator.id === userId) {
        setActiveCall(payload);
      }
    });

    socket.on('call:accepted', (payload: CallSession) => {
      setIncomingCall(null);
      if (payload.initiator.id === userId || payload.target?.id === userId) {
        setActiveCall(payload);
      }
    });

    socket.on('call:updated', (payload: CallSession) => {
      if (payload.initiator.id === userId || payload.target?.id === userId) {
        setActiveCall(payload);
      }
    });

    socket.on('call:note', (payload: { callId: string; note: CallSession['notes'][0] }) => {
      setActiveCall((prev) => {
        if (!prev || prev.id !== payload.callId) return prev;
        return { ...prev, notes: [...prev.notes, payload.note] };
      });
    });

    socket.on('call:ended', (payload: CallSession) => {
      if (payload.initiator.id === userId || payload.target?.id === userId) {
        setActiveCall(null);
        setIncomingCall(null);
        setPanelExpanded(false);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [portal, session, userId]);

  useEffect(() => {
    if (
      !activeCall?.startedAt ||
      !['CONNECTED', 'ON_HOLD'].includes(activeCall.status) ||
      isExternalCallChannel(activeCall.channel)
    ) {
      setElapsedSec(0);
      return;
    }
    const start = new Date(activeCall.startedAt).getTime();
    const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeCall?.id, activeCall?.startedAt, activeCall?.status]);

  const startCall = useCallback(
    async (channel: CallChannel, target: CallTarget) => {
      if (!portal) return;
      const api = apiForPortal(portal);
      const res = await api.post<ApiResponse<CallSession>>('/calls', {
        channel,
        targetUserId: target.userId,
        targetPhone: target.phone,
        targetName: target.name,
        targetRole: target.role,
        incidentId: target.incidentId,
      });
      setActiveCall(res.data);
      setPanelExpanded(true);

      if (channel === 'WHATSAPP' && target.phone) {
        window.open(whatsappCallHref(target.phone), '_blank', 'noopener,noreferrer');
      } else if (channel === 'EXTERNAL' && target.phone) {
        window.location.href = telHref(target.phone);
      }
    },
    [portal],
  );

  const acceptCall = useCallback(async () => {
    if (!portal || !incomingCall) return;
    const res = await apiForPortal(portal).patch<ApiResponse<CallSession>>(
      `/calls/${incomingCall.id}/accept`,
    );
    setIncomingCall(null);
    setActiveCall(res.data);
    setPanelExpanded(true);
  }, [portal, incomingCall]);

  const declineCall = useCallback(async () => {
    if (!portal || !incomingCall) return;
    await apiForPortal(portal).patch(`/calls/${incomingCall.id}/decline`);
    setIncomingCall(null);
  }, [portal, incomingCall]);

  const endCall = useCallback(async () => {
    if (!portal || !activeCall) return;
    await apiForPortal(portal).patch(`/calls/${activeCall.id}/end`);
    setActiveCall(null);
    setPanelExpanded(false);
  }, [portal, activeCall]);

  const toggleMute = useCallback(async () => {
    if (!portal || !activeCall) return;
    const res = await apiForPortal(portal).patch<ApiResponse<CallSession>>(
      `/calls/${activeCall.id}/mute`,
    );
    setActiveCall(res.data);
  }, [portal, activeCall]);

  const toggleHold = useCallback(async () => {
    if (!portal || !activeCall) return;
    const res = await apiForPortal(portal).patch<ApiResponse<CallSession>>(
      `/calls/${activeCall.id}/hold`,
    );
    setActiveCall(res.data);
  }, [portal, activeCall]);

  const addNote = useCallback(
    async (content: string, noteType: 'NOTE' | 'REPORT' = 'NOTE') => {
      if (!portal || !activeCall || !content.trim()) return;
      await apiForPortal(portal).post(`/calls/${activeCall.id}/notes`, { content, noteType });
    },
    [portal, activeCall],
  );

  const value = useMemo(
    () => ({
      portal,
      activeCall,
      incomingCall,
      panelExpanded,
      setPanelExpanded,
      startCall,
      acceptCall,
      declineCall,
      endCall,
      toggleMute,
      toggleHold,
      addNote,
      elapsedSec,
    }),
    [
      portal,
      activeCall,
      incomingCall,
      panelExpanded,
      startCall,
      acceptCall,
      declineCall,
      endCall,
      toggleMute,
      toggleHold,
      addNote,
      elapsedSec,
    ],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCalls() {
  const ctx = useContext(CallContext);
  if (!ctx || !ctx.portal) {
    throw new Error('useCalls requires an authenticated session within CallProvider');
  }
  return ctx;
}

export function useCallsOptional() {
  return useContext(CallContext);
}
