import { Module } from '@nestjs/common';
import { ProcurementsService } from './procurements.service';
import { ProcurementsController } from './procurements.controller';

@Module({
  controllers: [ProcurementsController],
  providers: [ProcurementsService],
  exports: [ProcurementsService],
})
export class ProcurementsModule {}
