import { Module } from '@nestjs/common';
import { SurveillanceModule } from '../surveillance/surveillance.module';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { LoyaltyService } from './loyalty.service';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [SurveillanceModule],
  controllers: [ClientController],
  providers: [ClientService, SubscriptionService, LoyaltyService],
  exports: [ClientService, SubscriptionService, LoyaltyService],
})
export class ClientModule {}
