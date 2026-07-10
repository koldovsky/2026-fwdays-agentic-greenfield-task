import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { UserModel } from '../../generated/prisma/models';
import { PrismaService } from '../prisma/prisma.service';
import { AUTH_CONFIG, AuthConfig } from './auth-config';
import { parseCookies, SESSION_COOKIE } from './cookies';
import { OtpService } from './otp.service';
import { normalizeProfileName } from './profile';
import { Public } from './public.decorator';
import type { AuthenticatedRequest } from './session.guard';
import { SessionService } from './session.service';

export interface UserDto {
  id: number;
  phone: string;
  name: string | null;
}

// BigInt ids don't survive JSON.stringify — expose them as numbers
function toUserDto(user: UserModel): UserDto {
  return { id: Number(user.id), phone: user.phone, name: user.name };
}

// No class-validator (BC-PRIN-01): the auth DTOs are two scalar fields,
// validated in the services; unknown shapes collapse to '' → clear errors.
function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly otp: OtpService,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  @Public()
  @Post('otp/request')
  @HttpCode(200)
  requestOtp(@Body() body: { phone?: unknown }): Promise<{ devCode?: string }> {
    return this.otp.requestOtp(asString(body?.phone));
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(
    @Body() body: { phone?: unknown; code?: unknown },
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    const user = await this.otp.verifyOtp(
      asString(body?.phone),
      asString(body?.code),
    );
    const { token, expiresAt } = await this.sessions.create(user.id);
    // NFR-SEC-01: httpOnly + SameSite=Lax; Secure per environment (D2)
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      expires: expiresAt,
      path: '/',
    });
    return toUserDto(user);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (token) await this.sessions.revoke(token);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@Req() req: AuthenticatedRequest): UserDto {
    return toUserDto(req.user);
  }

  @Patch('me')
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name?: unknown },
  ): Promise<UserDto> {
    const user = await this.prisma.user.update({
      where: { id: req.user.id },
      data: { name: normalizeProfileName(body?.name) },
    });
    return toUserDto(user);
  }
}
