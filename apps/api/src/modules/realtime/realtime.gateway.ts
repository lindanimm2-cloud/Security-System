import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
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
  vehicleId?: string | null;
};

export type PositionUpdatePayload = {
  entityType: 'client' | 'officer' | 'vehicle' | 'fleet';
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
      client.data.role = payload.role;
      client.join(`tenant:${payload.tenantId}`);
      client.join(`user:${payload.sub}`);
      if (payload.role) client.join(`role:${payload.role}`);
      this.logger.log(`Client connected: ${payload.sub} (tenant ${payload.tenantId})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.data.userId ?? 'unknown'}`);
  }

  @SubscribeMessage('incident:subscribe')
  handleIncidentSubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { incidentId?: string }) {
    if (body?.incidentId) client.join(`incident:${body.incidentId}`);
  }

  @SubscribeMessage('incident:unsubscribe')
  handleIncidentUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { incidentId?: string }) {
    if (body?.incidentId) client.leave(`incident:${body.incidentId}`);
  }

  emitIncidentCreated(tenantId: string, incident: MapIncidentPayload & { publicRef?: string }) {
    this.server.to(`tenant:${tenantId}`).emit('incident:created', incident);
  }

  emitPlatformEvent(
    tenantId: string,
    event: string,
    payload: Record<string, unknown> | MapIncidentPayload,
    rooms?: { incidentId?: string | null; userId?: string | null },
  ) {
    this.server.to(`tenant:${tenantId}`).emit(event, payload);
    this.server.to(`tenant:${tenantId}`).emit('platform:event', { event, payload });
    if (rooms?.incidentId) {
      this.server.to(`incident:${rooms.incidentId}`).emit(event, payload);
    }
    if (rooms?.userId) {
      this.server.to(`user:${rooms.userId}`).emit(event, payload);
    }
  }

  emitPositionUpdates(tenantId: string, updates: PositionUpdatePayload[]) {
    this.server.to(`tenant:${tenantId}`).emit('position:update', updates);
  }

  emitNotification(tenantId: string, notification: Record<string, unknown>) {
    this.server.to(`tenant:${tenantId}`).emit('notification:new', notification);
    const userId = typeof notification.userId === 'string' ? notification.userId : null;
    if (userId) this.server.to(`user:${userId}`).emit('notification:new', notification);
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

  emitClientSupportMessage(
    tenantId: string,
    clientUserId: string,
    message: Record<string, unknown>,
  ) {
    this.server
      .to(`tenant:${tenantId}`)
      .emit('chat:client', { clientUserId, ...message });
  }

  emitCallEvent(tenantId: string, event: string, payload: Record<string, unknown>) {
    this.server.to(`tenant:${tenantId}`).emit(event, payload);
  }
}
