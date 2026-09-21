import { Global, Module } from '@nestjs/common';
import { AlertEscalationService } from './alert-escalation.service';
import { AlertsController } from './alerts.controller';

@Global()
@Module({
  controllers: [AlertsController],
  providers: [AlertEscalationService],
  exports: [AlertEscalationService],
})
export class AlertsModule {}
