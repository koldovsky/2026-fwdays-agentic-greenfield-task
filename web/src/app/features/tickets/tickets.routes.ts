import { Route } from '@angular/router';
import { TicketCardPage } from './ticket-card-page';
import { TicketFormPage } from './ticket-form-page';
import { TicketListPage } from './ticket-list-page';

export const ticketsRoutes: Route[] = [
  { path: '', component: TicketListPage },
  { path: 'new', component: TicketFormPage },
  { path: ':id/edit', component: TicketFormPage },
  { path: ':id', component: TicketCardPage },
];
