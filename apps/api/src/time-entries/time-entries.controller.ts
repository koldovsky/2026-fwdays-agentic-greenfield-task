import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { TimeEntry } from '@honeydo/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { ManualTimeEntryDto } from './dto/manual-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { TimeEntriesService } from './time-entries.service';

/** All routes are user-scoped and require a valid access token (FR-ENTRY-11, FR-AUTH-06). */
@UseGuards(JwtAuthGuard)
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly service: TimeEntriesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<TimeEntry[]> {
    return this.service.list(user.userId);
  }

  @Get('running')
  running(@CurrentUser() user: AuthenticatedUser): Promise<TimeEntry | null> {
    return this.service.getRunning(user.userId);
  }

  @Post()
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTimeEntryDto,
  ): Promise<TimeEntry> {
    return this.service.start(user.userId, dto);
  }

  @Post('manual')
  manual(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ManualTimeEntryDto,
  ): Promise<TimeEntry> {
    return this.service.createManual(user.userId, dto);
  }

  @Post(':id/stop')
  stop(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<TimeEntry> {
    return this.service.stop(user.userId, id);
  }

  @Post(':id/continue')
  continue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<TimeEntry> {
    return this.service.continue(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTimeEntryDto,
  ): Promise<TimeEntry> {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.remove(user.userId, id);
  }
}
