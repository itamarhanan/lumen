import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { LumenEventSchema } from './event.schema';
import { CollectorService } from './collector.service';

@Controller('/')
export class CollectorController {
  constructor(private readonly collectorService: CollectorService) {}

  @Post('/collect')
  async collect(@Body() body: unknown, @Req() req: Request) {
    const parsed = LumenEventSchema.parse(body);
    const ip = req.ip ?? req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.collectorService.enqueue(parsed, ip, userAgent);
  }
}
