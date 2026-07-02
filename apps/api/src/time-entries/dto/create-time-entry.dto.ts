import {
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { CreateTimeEntry } from '@honeydo/shared';

/** Start a running entry. `startedAt` defaults to server "now" when omitted. */
export class CreateTimeEntryDto implements CreateTimeEntry {
  @IsString()
  @IsNotEmpty()
  note!: string;

  @IsOptional()
  @IsISO8601()
  startedAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
