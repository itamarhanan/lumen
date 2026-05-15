import { Router, Mutation, Input } from 'nestjs-trpc';
import { CollectorService } from './collector.service';
import { LumenEventSchema } from './event.schema';

@Router({ alias: 'collector' })
export class CollectorRouter {
  constructor(private readonly collectorService: CollectorService) {}

  // Take any event with an unknown schema and parse it for validation
  @Mutation({ input: LumenEventSchema })
  async collect(@Input() event: unknown) {
    const parsed = LumenEventSchema.parse(event);
    return await this.collectorService.enqueue(parsed);
  }
}
