import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { LumenEventSchema } from './event.schema';
import { CollectorService } from './collector.service';

@Controller('/')
export class CollectorController {
  constructor(private readonly collectorService: CollectorService) {}

  @Post('/collect')
  async collect(@Body() body: unknown, @Req() req: Request) {
    const parsed = LumenEventSchema.parse(body);
    const ip = (req.ip ?? req.socket?.remoteAddress) as string | undefined;
    const userAgent = req.headers['user-agent'] as string | undefined;
    return this.collectorService.enqueue(parsed, ip, userAgent);
  }
}
