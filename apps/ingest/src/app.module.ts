import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CollectorModule } from './collector/collector.module';
import { TRPCModule } from 'nestjs-trpc';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    TRPCModule.forRoot({
      basePath: '/api',
    }),
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
  providers: [AppService],
})
export class AppModule {}
