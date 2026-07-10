import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthFacade } from '../features/auth/data/auth-facade';

// Protects app routes: unauthenticated visitors land on /login. Awaits the
// bootstrap session probe so a returning user with a live cookie opens the
// app directly (FR-AUTH-04).
export const authGuard: CanActivateFn = async () => {
  const facade = inject(AuthFacade);
  const router = inject(Router);
  await facade.init();
  return facade.status() === 'authenticated' ? true : router.parseUrl('/login');
};
