import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { CollectorModule } from './collector/collector.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL,
    }),
    ThrottlerModule.forRoot([
      {
        limit: 100,
        ttl: 60000,
        blockDuration: 10000,
      },
    ]),
    CollectorModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
