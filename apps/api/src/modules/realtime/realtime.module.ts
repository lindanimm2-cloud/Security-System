import { Global, Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MapTickerService } from './map-ticker.service';
import { RealtimeGateway } from './realtime.gateway';

@Global()
@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [RealtimeGateway, MapTickerService],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
