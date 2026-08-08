import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MapTickerService } from './map-ticker.service';
import { RealtimeGateway } from './realtime.gateway';

@Global()
@Module({
  imports: [AuthModule],
  providers: [RealtimeGateway, MapTickerService],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
