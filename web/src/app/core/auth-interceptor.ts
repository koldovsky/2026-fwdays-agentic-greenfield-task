import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthFacade } from '../features/auth/data/auth-facade';
import { SKIP_AUTH_REDIRECT } from './auth-context';

// Session-expiry handling in one place (design D9): any guarded endpoint
// answering 401 drops the client session state and lands on /login. Later
// slices get this for free.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const facade = inject(AuthFacade);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !req.context.get(SKIP_AUTH_REDIRECT)
      ) {
        facade.sessionLost();
        void router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
