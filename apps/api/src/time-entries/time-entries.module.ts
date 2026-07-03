import { Module } from '@nestjs/common';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';

/** The core tracking loop: user-scoped CRUD + start/stop/continue (FR-ENTRY-01→11). */
@Module({
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService],
})
export class TimeEntriesModule {}
