import {
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { UpdateTag } from '@honeydo/shared';

/** Edit a tag (FR-TAG-03); rename and/or recolor. */
export class UpdateTagDto implements UpdateTag {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string | null;
}
