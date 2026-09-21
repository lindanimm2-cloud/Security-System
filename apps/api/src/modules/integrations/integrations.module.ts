import { Module } from '@nestjs/common';
import { IncidentCorrelationService } from './correlation/incident-correlation.service';
import { CrashDetectionManager } from './crash/crash-detection.manager';
import { IntegrationsController } from './integrations.controller';
import { VoiceIntegrationManager } from './voice/voice-integration.manager';

@Module({
  controllers: [IntegrationsController],
  providers: [VoiceIntegrationManager, CrashDetectionManager, IncidentCorrelationService],
  exports: [VoiceIntegrationManager, CrashDetectionManager, IncidentCorrelationService],
})
export class IntegrationsModule {}
