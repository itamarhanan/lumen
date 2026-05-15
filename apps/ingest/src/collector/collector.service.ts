import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { LumenEvent } from './event.schema';

export interface RedisEnvelope {
  raw: LumenEvent;
  receivedAt: number;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class CollectorService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async enqueue(event: LumenEvent, ip?: string, userAgent?: string) {
    const envelope: RedisEnvelope = {
      raw: event,
      receivedAt: Date.now(),
      ip,
      userAgent,
    };
    await this.redis.xadd(
      'lumen:events',
      '*',
      'data',
      JSON.stringify(envelope),
    );
  }
}
