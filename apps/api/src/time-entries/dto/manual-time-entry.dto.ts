import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';
import type { ManualTimeEntry } from '@honeydo/shared';

/**
 * Add a completed manual entry (FR-ENTRY-04). Both times are required; the
 * end-after-start rule is enforced in the service (it needs both values).
 */
export class ManualTimeEntryDto implements ManualTimeEntry {
  @IsString()
  @IsNotEmpty()
  note!: string;

  @IsISO8601()
  startedAt!: string;

  @IsISO8601()
  stoppedAt!: string;
}
