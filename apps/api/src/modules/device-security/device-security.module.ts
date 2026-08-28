import { Module } from '@nestjs/common';
import { ClientSecurityController } from './client-security.controller';
import { ControlRoomSecurityController } from './control-room-security.controller';
import { DeviceSecurityService } from './device-security.service';

@Module({
  controllers: [ClientSecurityController, ControlRoomSecurityController],
  providers: [DeviceSecurityService],
  exports: [DeviceSecurityService],
})
export class DeviceSecurityModule {}
