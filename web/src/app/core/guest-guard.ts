import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthFacade } from '../features/auth/data/auth-facade';

// Mirror of authGuard for /login (S-03, plan v1.6): an already-authenticated
// user has nothing to do on the login screen — send them home.
export const guestGuard: CanActivateFn = async () => {
  const facade = inject(AuthFacade);
  const router = inject(Router);
  await facade.init();
  return facade.status() === 'authenticated' ? router.parseUrl('/') : true;
};
