import { Module } from '@nestjs/common';
import { PhysicalControlController } from './physical-control.controller';
import { PhysicalControlService } from './physical-control.service';

@Module({
  controllers: [PhysicalControlController],
  providers: [PhysicalControlService],
  exports: [PhysicalControlService],
})
export class PhysicalControlModule {}
