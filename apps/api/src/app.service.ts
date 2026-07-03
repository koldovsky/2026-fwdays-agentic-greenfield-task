import { Injectable } from '@nestjs/common';
import type { HealthStatus } from '@honeydo/shared';

@Injectable()
export class AppService {
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      service: 'honeydo-api',
      time: new Date().toISOString(),
    };
  }
}
