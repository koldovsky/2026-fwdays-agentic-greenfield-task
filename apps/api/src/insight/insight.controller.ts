import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { DailyInsight } from '@honeydo/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { InsightService } from './insight.service';

/**
 * Daily-insight routes — authenticated and user-scoped (FR-AUTH-06, BC-SCOPE-01). The `tz`
 * query is the caller's IANA time zone; the server defaults to UTC when it is missing/invalid.
 */
@UseGuards(JwtAuthGuard)
@Controller('insight')
export class InsightController {
  constructor(private readonly service: InsightService) {}

  /** Today's insight (cached-or-generated). */
  @Get()
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Query('tz') tz?: string,
  ): Promise<DailyInsight> {
    return this.service.getForToday(user.userId, tz);
  }

  /** Force one regeneration for today (FR-INSIGHT-03). */
  @Post('refresh')
  refresh(
    @CurrentUser() user: AuthenticatedUser,
    @Query('tz') tz?: string,
  ): Promise<DailyInsight> {
    return this.service.refresh(user.userId, tz);
  }
}
