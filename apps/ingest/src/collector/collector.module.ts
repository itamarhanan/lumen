import { Module } from '@nestjs/common';
import { CollectorService } from './collector.service';

@Module({
  controllers: [],
  providers: [CollectorService],
})
export class CollectorModule {}
