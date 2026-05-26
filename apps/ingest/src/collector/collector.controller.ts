import { Body, Controller, Post, Req } from '@nestjs/common';
import { type Request } from 'express';
import { LumenEventSchema, IdentifyPayloadSchema } from './event.schema';
import { CollectorService } from './collector.service';

@Controller('/')
export class CollectorController {
  constructor(private readonly collectorService: CollectorService) {}

  @Post('/collect')
  async collect(@Body() body: unknown, @Req() req: Request) {
    const raw = body as Record<string, unknown>;
    if (raw?.type === 'identify') {
      const parsed = IdentifyPayloadSchema.parse(body);
      const ip = req.ip ?? req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'];
      return this.collectorService.enqueueIdentify(parsed, ip, userAgent);
    }
    const parsed = LumenEventSchema.parse(body);
    const ip = req.ip ?? req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.collectorService.enqueue(parsed, ip, userAgent);
  }
}
