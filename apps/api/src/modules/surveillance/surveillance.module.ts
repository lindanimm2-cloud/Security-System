import { Module } from '@nestjs/common';
import { SurveillanceService } from './surveillance.service';
import { VmsController } from './vms.controller';
import { VmsService } from './vms.service';

@Module({
  controllers: [VmsController],
  providers: [SurveillanceService, VmsService],
  exports: [SurveillanceService],
})
export class SurveillanceModule {}
