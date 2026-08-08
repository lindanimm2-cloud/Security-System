import { Module } from '@nestjs/common';
import { ClientModule } from '../client/client.module';
import { SurveillanceModule } from '../surveillance/surveillance.module';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Module({
  imports: [ClientModule, SurveillanceModule],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
