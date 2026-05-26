import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { LumenEvent, IdentifyPayload } from './event.schema';

type RedisPayload = LumenEvent | IdentifyPayload;

interface RedisEnvelope {
  raw: RedisPayload;
  receivedAt: number;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class CollectorService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async enqueue(event: LumenEvent, ip?: string, userAgent?: string) {
    await this.pushToStream(event, ip, userAgent);
  }

  async enqueueIdentify(
    payload: IdentifyPayload,
    ip?: string,
    userAgent?: string,
  ) {
    await this.pushToStream(payload, ip, userAgent);
  }

  private async pushToStream(
    raw: RedisPayload,
    ip?: string,
    userAgent?: string,
  ) {
    const envelope: RedisEnvelope = {
      raw,
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
