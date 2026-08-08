import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export type MapIncidentPayload = {
  id: string;
  category?: string;
  type: string;
  priority: string;
  status: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  isSilent?: boolean;
  createdAt?: string;
  trail?: { lat: number; lng: number }[];
};

export type PositionUpdatePayload = {
  entityType: 'client' | 'officer' | 'vehicle';
  id: string;
  lat: number;
  lng: number;
};

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3010', credentials: true },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string; tenantId: string; role: string }>(
        token,
      );

      client.data.userId = payload.sub;
      client.data.tenantId = payload.tenantId;
      client.join(`tenant:${payload.tenantId}`);
      this.logger.log(`Client connected: ${payload.sub} (tenant ${payload.tenantId})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.data.userId ?? 'unknown'}`);
  }

  emitIncidentCreated(tenantId: string, incident: MapIncidentPayload) {
    this.server.to(`tenant:${tenantId}`).emit('incident:created', incident);
  }

  emitPositionUpdates(tenantId: string, updates: PositionUpdatePayload[]) {
    this.server.to(`tenant:${tenantId}`).emit('position:update', updates);
  }

  emitNotification(tenantId: string, notification: Record<string, unknown>) {
    this.server.to(`tenant:${tenantId}`).emit('notification:new', notification);
  }

  emitChatMessage(tenantId: string, message: Record<string, unknown>) {
    this.server.to(`tenant:${tenantId}`).emit('chat:message', message);
  }

  emitFamilyChatMessage(
    tenantId: string,
    familyId: string,
    message: Record<string, unknown>,
  ) {
    this.server.to(`tenant:${tenantId}`).emit('chat:family', { familyId, ...message });
  }

  emitCallEvent(tenantId: string, event: string, payload: Record<string, unknown>) {
    this.server.to(`tenant:${tenantId}`).emit(event, payload);
  }
}
