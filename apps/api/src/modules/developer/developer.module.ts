import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { DeveloperController } from './developer.controller';
import { DeveloperService } from './developer.service';

@Module({
  imports: [RealtimeModule],
  controllers: [DeveloperController],
  providers: [DeveloperService],
  exports: [DeveloperService],
})
export class DeveloperModule {}
