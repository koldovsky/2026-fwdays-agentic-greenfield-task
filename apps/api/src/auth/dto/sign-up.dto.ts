import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import type { SignUpRequest } from '@honeydo/shared';

export class SignUpDto implements SignUpRequest {
  @IsEmail()
  email!: string;

  // Strength is enforced in the service via the shared validatePassword so the
  // client and server share one policy (FR-AUTH-01).
  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}
