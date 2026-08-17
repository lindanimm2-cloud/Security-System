import { Module } from '@nestjs/common';
import { SurveillanceModule } from '../surveillance/surveillance.module';
import { OfficerController } from './officer.controller';
import { OfficerService } from './officer.service';

@Module({
  imports: [SurveillanceModule],
  controllers: [OfficerController],
  providers: [OfficerService],
})
export class OfficerModule {}
