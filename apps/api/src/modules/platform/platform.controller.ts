import { Controller, Get, Headers, Query } from '@nestjs/common';
import { PlatformService } from './platform.service';

@Controller('platform')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('apps')
  apps() {
    return this.platform.listApps();
  }

  @Get('compatibility')
  compatibility(@Headers('user-agent') ua?: string, @Query('ua') uaQuery?: string) {
    return this.platform.compatibility(uaQuery || ua || '');
  }

  @Get('ecosystem')
  ecosystem() {
    return this.platform.ecosystem();
  }
}
