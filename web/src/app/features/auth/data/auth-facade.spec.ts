import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthApi } from './auth-api';
import { AuthFacade } from './auth-facade';
import { UserDto } from './auth.model';

const USER: UserDto = { id: 1, phone: '+380671234567', name: null };

function apiError(status: number, code: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { code, message: code } });
}

function setup(api: Partial<AuthApi>): AuthFacade {
  TestBed.configureTestingModule({
    providers: [{ provide: AuthApi, useValue: api }],
  });
  return TestBed.inject(AuthFacade);
}

describe('AuthFacade', () => {
  it('init resolves an existing session to authenticated (FR-AUTH-04)', async () => {
    const facade = setup({ me: () => of(USER) });
    await facade.init();
    expect(facade.status()).toBe('authenticated');
    expect(facade.user()).toEqual(USER);
  });

  it('init treats 401 as guest, not an error', async () => {
    const facade = setup({
      me: () => throwError(() => apiError(401, 'UNAUTHENTICATED')),
    });
    await facade.init();
    expect(facade.status()).toBe('guest');
    expect(facade.user()).toBeNull();
  });

  it('requestOtp advances to the code step on success', async () => {
    const facade = setup({ requestOtp: () => of({ devCode: '123456' }) });
    await facade.requestOtp('+380671234567');
    expect(facade.codeRequested()).toBe(true);
    expect(facade.error()).toBeNull();
  });

  it('requestOtp maps a rate-limit error to Ukrainian copy (FR-AUTH-03)', async () => {
    const facade = setup({
      requestOtp: () => throwError(() => apiError(429, 'RATE_LIMITED_60S')),
    });
    await facade.requestOtp('+380671234567');
    expect(facade.codeRequested()).toBe(false);
    expect(facade.error()).toContain('Зачекайте хвилину');
  });

  it('verifyOtp authenticates on success and resets the login flow', async () => {
    const facade = setup({
      requestOtp: () => of({}),
      verifyOtp: () => of(USER),
    });
    await facade.requestOtp('+380671234567');
    await expect(facade.verifyOtp('+380671234567', '123456')).resolves.toBe(
      true,
    );
    expect(facade.status()).toBe('authenticated');
    expect(facade.user()).toEqual(USER);
    expect(facade.codeRequested()).toBe(false);
  });

  it('verifyOtp surfaces attempt exhaustion (FR-AUTH-02)', async () => {
    const facade = setup({
      verifyOtp: () => throwError(() => apiError(400, 'OTP_ATTEMPTS_EXCEEDED')),
    });
    await expect(facade.verifyOtp('+380671234567', '000000')).resolves.toBe(
      false,
    );
    expect(facade.status()).toBe('unknown');
    expect(facade.error()).toContain('Забагато');
  });

  it('logout drops the session state even when the API call fails', async () => {
    const facade = setup({
      me: () => of(USER),
      logout: () => throwError(() => new Error('network down')),
    });
    await facade.init();
    await facade.logout();
    expect(facade.status()).toBe('guest');
    expect(facade.user()).toBeNull();
  });

  it('updateName stores the refreshed user', async () => {
    const facade = setup({
      me: () => of(USER),
      updateName: () => of({ ...USER, name: 'Василь' }),
    });
    await facade.init();
    await facade.updateName('Василь');
    expect(facade.user()?.name).toBe('Василь');
  });
});
