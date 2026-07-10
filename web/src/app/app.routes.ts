import { Route } from '@angular/router';
import { authGuard } from './core/auth-guard';
import { guestGuard } from './core/guest-guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'houses',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/houses/houses.routes').then((m) => m.housesRoutes),
  },
  {
    path: 'tickets',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/tickets/tickets.routes').then((m) => m.ticketsRoutes),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/home/home.routes').then((m) => m.homeRoutes),
  },
];
