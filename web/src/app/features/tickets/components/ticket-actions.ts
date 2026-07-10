import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { transitionActionLabel } from '../data/ticket-labels';
import { TicketStatus } from '../data/ticket.model';

// Presentational (ADR-0009): renders one button per server-provided allowed
// transition (FR-STATUS-02 at the UI level) — the SPA owns no transition
// rules, a terminal status simply arrives with an empty list and renders
// nothing. Labels are the PRD §5.1 action names.
@Component({
  selector: 'app-ticket-actions',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (allowedTransitions().length > 0) {
      <section class="actions" aria-label="Дії зі статусом">
        @for (to of allowedTransitions(); track to) {
          <button
            matButton="tonal"
            type="button"
            [disabled]="pending()"
            (click)="transition.emit(to)"
          >
            {{ label(to) }}
          </button>
        }
      </section>
    }
  `,
  styles: `
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .actions button {
      flex: 1 1 auto;
    }
  `,
})
export class TicketActions {
  readonly status = input.required<TicketStatus>();
  readonly allowedTransitions = input.required<TicketStatus[]>();
  readonly pending = input(false);
  readonly transition = output<TicketStatus>();

  protected label(to: TicketStatus): string {
    return transitionActionLabel(this.status(), to);
  }
}
