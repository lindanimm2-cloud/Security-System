import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientModule } from './modules/client/client.module';
import { ControlRoomModule } from './modules/control-room/control-room.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { HealthModule } from './modules/health/health.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { IncidentKernelModule } from './modules/incident-kernel/incident-kernel.module';
import { OfficerModule } from './modules/officer/officer.module';
import { MedicalModule } from './modules/medical/medical.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ChatModule } from './modules/chat/chat.module';
import { CallsModule } from './modules/calls/calls.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { StoreModule } from './modules/store/store.module';
import { DeviceSecurityModule } from './modules/device-security/device-security.module';
import { AssuranceModule } from './modules/assurance/assurance.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { PlatformModule } from './modules/platform/platform.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { PhysicalControlModule } from './modules/physical-control/physical-control.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
      {
        name: 'auth',
        ttl: 15 * 60_000,
        limit: 20,
      },
    ]),
    PrismaModule,
    AuthModule,
    RealtimeModule,
    AlertsModule,
    PlatformModule,
    IncidentKernelModule,
    IntegrationsModule,
    PhysicalControlModule,
    ClientModule,
    ControlRoomModule,
    OfficerModule,
    ChatModule,
    CallsModule,
    DocumentsModule,
    StoreModule,
    DeviceSecurityModule,
    AssuranceModule,
    DeveloperModule,
    HealthModule,
    TenantsModule,
    MedicalModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
