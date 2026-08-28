import { Module } from '@nestjs/common';
import { DeviceSecurityModule } from '../device-security/device-security.module';
import { DeveloperModule } from '../developer/developer.module';
import { SurveillanceModule } from '../surveillance/surveillance.module';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { LoyaltyService } from './loyalty.service';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [SurveillanceModule, DeveloperModule, DeviceSecurityModule],
  controllers: [ClientController],
  providers: [ClientService, SubscriptionService, LoyaltyService],
  exports: [ClientService, SubscriptionService, LoyaltyService],
})
export class ClientModule {}
