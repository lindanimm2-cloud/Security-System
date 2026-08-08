import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientModule } from './modules/client/client.module';
import { ControlRoomModule } from './modules/control-room/control-room.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { HealthModule } from './modules/health/health.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { OfficerModule } from './modules/officer/officer.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ChatModule } from './modules/chat/chat.module';
import { CallsModule } from './modules/calls/calls.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { StoreModule } from './modules/store/store.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    RealtimeModule,
    ClientModule,
    ControlRoomModule,
    OfficerModule,
    ChatModule,
    CallsModule,
    DocumentsModule,
    StoreModule,
    DeveloperModule,
    HealthModule,
    TenantsModule,
  ],
})
export class AppModule {}
