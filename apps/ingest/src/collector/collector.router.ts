import { Router } from 'nestjs-trpc';
import { CollectorService } from './collector.service';

@Router({ alias: 'collector' })
export class CollectorRouter {
  constructor(private readonly collectorService: CollectorService) {}
}
