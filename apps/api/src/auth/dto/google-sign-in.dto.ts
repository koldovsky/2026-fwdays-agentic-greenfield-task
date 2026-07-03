import { IsString } from 'class-validator';
import type { GoogleSignInRequest } from '@honeydo/shared';

export class GoogleSignInDto implements GoogleSignInRequest {
  @IsString()
  idToken!: string;
}
