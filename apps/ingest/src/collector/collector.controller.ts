import { Body, Controller, Post } from '@nestjs/common';
import { LumenEventSchema } from './event.schema';
import { CollectorService } from './collector.service';

@Controller('/')
export class CollectorController {
  constructor(private readonly collectorService: CollectorService) {}

  @Post('/collect')
  async collect(@Body() body: unknown) {
    const parsed = LumenEventSchema.parse(body);
    return this.collectorService.enqueue(parsed);
  }
}
