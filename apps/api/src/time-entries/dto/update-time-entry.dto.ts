import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { UpdateTimeEntry } from '@honeydo/shared';

/** Edit an entry (FR-ENTRY-05). Every field optional; times validated in the service. */
export class UpdateTimeEntryDto implements UpdateTimeEntry {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  note?: string;

  @IsOptional()
  @IsISO8601()
  startedAt?: string;

  @IsOptional()
  @IsISO8601()
  stoppedAt?: string;
}
