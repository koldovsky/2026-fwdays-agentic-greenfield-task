import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@honeydo/shared';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthStatus {
    return this.appService.getHealth();
  }
}
