import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthApi } from '../features/auth/data/auth-api';
import { guestGuard } from './guest-guard';

function runGuard(api: Partial<AuthApi>): Promise<boolean | UrlTree> {
  TestBed.configureTestingModule({
    providers: [{ provide: AuthApi, useValue: api }],
  });
  return TestBed.runInInjectionContext(
    () =>
      guestGuard(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ) as Promise<boolean | UrlTree>,
  );
}

describe('guestGuard', () => {
  it('redirects an authenticated user from /login to home', async () => {
    const result = await runGuard({
      me: () => of({ id: 1, phone: '+380671234567', name: null }),
    });
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result)).toBe('/');
  });

  it('lets an anonymous visitor open /login', async () => {
    const result = await runGuard({
      me: () => throwError(() => new Error('401')),
    });
    expect(result).toBe(true);
  });
});
