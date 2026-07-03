import {
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { CreateTag } from '@honeydo/shared';

/** Create a tag (FR-TAG-01). Name is required; color is an optional hex value. */
export class CreateTagDto implements CreateTag {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @IsHexColor()
  color?: string | null;
}
