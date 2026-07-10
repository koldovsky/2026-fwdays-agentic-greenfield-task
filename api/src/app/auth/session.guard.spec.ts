import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthError } from './auth-errors';
import { SESSION_COOKIE } from './cookies';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';

function contextFor(cookieHeader?: string): ExecutionContext {
  const request = { headers: { cookie: cookieHeader } };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SessionGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const sessions = { findUserByToken: jest.fn() };
  let guard: SessionGuard;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new SessionGuard(
      reflector as unknown as Reflector,
      sessions as unknown as SessionService,
    );
  });

  it('lets @Public() endpoints through without a session', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(contextFor())).resolves.toBe(true);
    expect(sessions.findUserByToken).not.toHaveBeenCalled();
  });

  it('rejects a request without a session cookie with 401', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const denied = guard.canActivate(contextFor());
    await expect(denied).rejects.toBeInstanceOf(AuthError);
    await denied.catch((e: AuthError) => expect(e.getStatus()).toBe(401));
  });

  it('rejects an unknown/expired token with 401', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    sessions.findUserByToken.mockResolvedValue(null);
    await expect(
      guard.canActivate(contextFor(`${SESSION_COOKIE}=stale-token`)),
    ).rejects.toBeInstanceOf(AuthError);
    expect(sessions.findUserByToken).toHaveBeenCalledWith('stale-token');
  });

  it('attaches the user to the request on a valid session', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const user = { id: BigInt(1), phone: '+380671234567', name: null };
    sessions.findUserByToken.mockResolvedValue(user);
    const context = contextFor(`${SESSION_COOKIE}=good-token; other=1`);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    const request = context.switchToHttp().getRequest<{ user?: unknown }>();
    expect(request.user).toBe(user);
  });
});
