import { Global, Module } from '@nestjs/common';
import { IncidentKernelController } from './incident-kernel.controller';
import { IncidentKernelService } from './incident-kernel.service';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from './permissions.service';

@Global()
@Module({
  controllers: [IncidentKernelController],
  providers: [IncidentKernelService, PermissionsService, PermissionsGuard],
  exports: [IncidentKernelService, PermissionsService, PermissionsGuard],
})
export class IncidentKernelModule {}
