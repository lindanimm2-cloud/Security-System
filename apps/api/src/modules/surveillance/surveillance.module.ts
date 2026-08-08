import { Module } from '@nestjs/common';
import { SurveillanceService } from './surveillance.service';

@Module({
  providers: [SurveillanceService],
  exports: [SurveillanceService],
})
export class SurveillanceModule {}
