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
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HousesFacade } from '../houses/data/houses-facade';
import { TicketForm } from './components/ticket-form';
import { TicketsFacade } from './data/tickets-facade';
import { TicketInput } from './data/ticket.model';

// Container for create ('/tickets/new') and edit ('/tickets/:id/edit'),
// mode driven by the route. Owns the state machine: houses/ticket loading →
// empty-directory hint → form; the form itself is presentational.
// Container template = loading/hint/content state machine; the branching
// is the page's whole job (ADR-0009), splitting further adds indirection.
// fallow-ignore-next-line complexity
@Component({
  selector: 'app-ticket-form-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    RouterLink,
    TicketForm,
  ],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'uk-UA' },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar class="toolbar">
      <a matIconButton [routerLink]="backLink()" aria-label="Назад">
        <mat-icon>arrow_back</mat-icon>
      </a>
      <span>{{ editedId() ? 'Редагувати заявку' : 'Нова заявка' }}</span>
    </mat-toolbar>
    <main class="content">
      @if (loading()) {
        <mat-spinner class="spinner" [diameter]="32" />
      } @else if (noHouses()) {
        <mat-card appearance="outlined">
          <mat-card-content class="hint">
            <p>
              Щоб створити заявку, спершу додайте будинок — заявка завжди
              прив’язана до будинку з вашого довідника.
            </p>
            <a matButton="filled" routerLink="/houses">Перейти до будинків</a>
          </mat-card-content>
        </mat-card>
      } @else if (ready()) {
        <app-ticket-form
          [houses]="houses.houses()"
          [ticket]="tickets.ticket()"
          [pending]="tickets.pending()"
          (saved)="onSave($event)"
          (cancelled)="onCancel()"
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

    .hint {
      display: grid;
      gap: 1rem;
      justify-items: start;
    }
  `,
})
export class TicketFormPage implements OnInit {
  protected readonly houses = inject(HousesFacade);
  protected readonly tickets = inject(TicketsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  // reactive, not route.snapshot: the router reuses the component instance
  // when only the param changes (S-04 review, medium finding)
  private readonly params = toSignal(this.route.paramMap);

  /** edit mode → the ticket id from the route, create mode → null */
  protected readonly editedId = computed(() => {
    const raw = this.params()?.get('id');
    return raw ? Number(raw) : null;
  });

  constructor() {
    // edit mode loads the prefill ticket; create mode resets the facade so
    // the form never inherits the last viewed ticket (review, high finding)
    effect(() => {
      const id = this.editedId();
      if (id !== null) void this.tickets.load(id);
      else this.tickets.reset();
    });
  }

  protected readonly loading = computed(
    () => this.houses.loading() || this.tickets.loading(),
  );

  protected readonly noHouses = computed(
    () => this.houses.loaded() && this.houses.houses().length === 0,
  );

  // create: houses are enough; edit: the prefill ticket must be there too
  protected readonly ready = computed(
    () =>
      this.houses.loaded() &&
      (this.editedId() === null || this.tickets.ticket() !== null),
  );

  protected backLink(): string[] {
    const id = this.editedId();
    return id ? ['/tickets', String(id)] : ['/'];
  }

  ngOnInit(): void {
    void this.houses.load();
  }

  protected async onSave(input: TicketInput): Promise<void> {
    const id = this.editedId();
    const ticket =
      id === null
        ? await this.tickets.create(input)
        : await this.tickets.update(id, input);
    if (ticket) {
      await this.router.navigate(['/tickets', ticket.id]);
    } else {
      this.snackBar.open(
        this.tickets.error() ?? 'Щось пішло не так. Спробуйте ще раз',
        'OK',
        { duration: 5000 },
      );
    }
  }

  protected onCancel(): void {
    void this.router.navigate(this.backLink());
  }
}
