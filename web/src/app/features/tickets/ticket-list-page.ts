import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HousesFacade } from '../houses/data/houses-facade';
import { TicketFilters } from './components/ticket-filters';
import { TicketList } from './components/ticket-list';
import { TicketsFacade } from './data/tickets-facade';
import {
  TicketListFilters,
  ticketListFiltersFromParams,
  ticketListFiltersToParams,
} from './data/ticket.model';

// List container (FR-LIST-01…04, FR-DUE-02): the URL query params are the
// single source of the filter state (design D8) — the filter bar navigates,
// the effect below reacts to the resulting URL and drives the facade. The
// load-more depth stays in the facade, not the URL.
@Component({
  selector: 'app-ticket-list-page',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    RouterLink,
    TicketFilters,
    TicketList,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar class="toolbar">
      <a matIconButton routerLink="/" aria-label="На головну">
        <mat-icon>arrow_back</mat-icon>
      </a>
      <span class="title">Заявки</span>
      <a matIconButton routerLink="/tickets/new" aria-label="Нова заявка">
        <mat-icon>add</mat-icon>
      </a>
    </mat-toolbar>
    <main class="content">
      <app-ticket-filters
        [filters]="filters()"
        [houses]="houses.houses()"
        (changed)="onFiltersChanged($event)"
      />
      @if (tickets.listError(); as error) {
        <section class="error">
          <p role="alert">{{ error }}</p>
          <button matButton="filled" type="button" (click)="onReload()">
            Спробувати ще раз
          </button>
        </section>
      } @else if (tickets.listLoading()) {
        <mat-spinner class="spinner" [diameter]="32" />
      } @else {
        <app-ticket-list
          [items]="tickets.listItems()"
          [hasMore]="tickets.listHasMore()"
          [loadingMore]="tickets.listLoadingMore()"
          (more)="onMore()"
        />
      }
    </main>
  `,
  styles: `
    .toolbar {
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      gap: 0.5rem;
    }

    .title {
      flex: 1;
    }

    .content {
      max-width: 40rem;
      margin: 0 auto;
      padding: 1rem;
      display: grid;
      gap: 1rem;
    }

    .spinner {
      justify-self: center;
      margin-top: 2rem;
    }

    .error {
      text-align: center;
      margin-top: 2rem;
      display: grid;
      gap: 1rem;
      justify-items: center;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class TicketListPage implements OnInit {
  protected readonly tickets = inject(TicketsFacade);
  protected readonly houses = inject(HousesFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  // reactive, never route.snapshot — the router reuses the instance when
  // only query params change (ADR-0009 checklist)
  private readonly queryParams = toSignal(this.route.queryParamMap);
  protected readonly filters = computed(() =>
    ticketListFiltersFromParams(this.queryParams()),
  );

  constructor() {
    effect(() => {
      void this.tickets.loadList(this.filters());
    });
  }

  ngOnInit(): void {
    void this.houses.load(); // fills the house filter select
  }

  protected onFiltersChanged(filters: TicketListFilters): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: ticketListFiltersToParams(filters),
    });
  }

  // a paging failure keeps the shown rows and surfaces as a snackbar, same
  // as houses-page mutations (S-06 review, medium)
  protected async onMore(): Promise<void> {
    const ok = await this.tickets.loadMore();
    if (!ok) {
      this.snackBar.open(
        this.tickets.listMoreError() ?? 'Щось пішло не так. Спробуйте ще раз',
        'OK',
        { duration: 5000 },
      );
    }
  }

  protected onReload(): void {
    void this.tickets.loadList(this.filters());
  }
}
