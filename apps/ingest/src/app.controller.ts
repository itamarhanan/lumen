import { Controller, Get } from '@nestjs/common';

@Controller('/api')
export class AppController {
  constructor() {}

  @Get('/health')
  health() {
    return { status: 'ok', timestamp: Date.now() };
  }
}
