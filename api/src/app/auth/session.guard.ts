import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserModel } from '../../generated/prisma/models';
import { AuthError } from './auth-errors';
import { parseCookies, SESSION_COOKIE } from './cookies';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SessionService } from './session.service';

export interface AuthenticatedRequest extends Request {
  user: UserModel;
}

// Global guard (APP_GUARD, design D5): secure by default — S-03+ endpoints
// are protected the moment they are written; a forgotten @Public() makes an
// endpoint accidentally private, never accidentally public.
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
    const user = token ? await this.sessions.findUserByToken(token) : null;
    if (!user) {
      throw new AuthError('UNAUTHENTICATED', 'Sign in required');
    }
    request.user = user;
    return true;
  }
}
