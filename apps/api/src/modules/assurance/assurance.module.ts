import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssuranceController } from './assurance.controller';
import { AssuranceService } from './assurance.service';

@Module({
  imports: [AuthModule],
  controllers: [AssuranceController],
  providers: [AssuranceService],
  exports: [AssuranceService],
})
export class AssuranceModule {}
