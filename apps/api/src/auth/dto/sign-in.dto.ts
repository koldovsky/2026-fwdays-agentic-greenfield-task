import { IsEmail, IsString } from 'class-validator';
import type { SignInRequest } from '@honeydo/shared';

export class SignInDto implements SignInRequest {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
