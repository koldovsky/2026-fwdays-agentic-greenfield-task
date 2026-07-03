import { IsString } from 'class-validator';
import type { RefreshRequest } from '@honeydo/shared';

export class RefreshDto implements RefreshRequest {
  @IsString()
  refreshToken!: string;
}
