import { Module } from '@nestjs/common';
import { ClientModule } from '../client/client.module';
import { SurveillanceModule } from '../surveillance/surveillance.module';
import { ControlRoomController } from './control-room.controller';
import { ControlRoomService } from './control-room.service';
import { FleetService } from './fleet.service';

@Module({
  imports: [ClientModule, SurveillanceModule],
  controllers: [ControlRoomController],
  providers: [ControlRoomService, FleetService],
  exports: [FleetService],
})
export class ControlRoomModule {}
