import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { SurveillanceModule } from '../surveillance/surveillance.module';
import { OfficerController } from './officer.controller';
import { OfficerService } from './officer.service';

@Module({
  imports: [RealtimeModule, SurveillanceModule],
  controllers: [OfficerController],
  providers: [OfficerService],
})
export class OfficerModule {}
