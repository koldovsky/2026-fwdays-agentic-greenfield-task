import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../data/ticket-labels';
import { TicketDto } from '../data/ticket.model';

// Presentational card (ADR-0009): number #N, status and every FR-TICKET-01
// attribute. No transition/feed/attachment UI in S-04.
@Component({
  selector: 'app-ticket-card',
  imports: [DatePipe, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card appearance="outlined">
      <mat-card-header class="header">
        <mat-card-title>
          <span class="number">#{{ ticket().id }}</span>
          {{ ticket().title }}
        </mat-card-title>
        <span class="status">{{ statusLabels[ticket().status] }}</span>
      </mat-card-header>
      <mat-card-content>
        @if (ticket().description; as description) {
          <p class="description">{{ description }}</p>
        }
        <dl class="details">
          <dt>Будинок</dt>
          <dd>{{ ticket().houseName }}</dd>
          <dt>Категорія</dt>
          <dd>{{ categoryLabels[ticket().category] }}</dd>
          <dt>Пріоритет</dt>
          <dd>{{ priorityLabels[ticket().priority] }}</dd>
          <dt>Цільовий термін</dt>
          <!-- no timezone arg: DatePipe parses a date-only ISO string as
               LOCAL midnight (unlike new Date()), so the calendar date
               renders unshifted in every timezone; adding 'UTC' would show
               the previous day east of Greenwich (S-04 review disposition) -->
          <dd [class.overdue]="ticket().isOverdue">
            {{ (ticket().dueDate | date: 'dd.MM.yyyy') ?? '—' }}
            @if (ticket().isOverdue) {
              <span class="overdue-badge">Прострочено</span>
            }
          </dd>
          <dt>Виконавець</dt>
          <dd>{{ ticket().executor ?? '—' }}</dd>
          <dt>Заявник</dt>
          <dd>{{ requester() }}</dd>
          <dt>Створено</dt>
          <dd>{{ ticket().createdAt | date: 'dd.MM.yyyy HH:mm' }}</dd>
        </dl>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .number {
      color: var(--mat-sys-on-surface-variant);
      font-weight: 400;
      margin-right: 0.25rem;
    }

    .status {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      border-radius: 1rem;
      padding: 0.25rem 0.75rem;
      font-size: var(--mat-sys-label-large-size);
      white-space: nowrap;
    }

    .description {
      white-space: pre-line;
      margin: 0.5rem 0 0;
    }

    .details {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.5rem 1rem;
      margin: 1rem 0 0;
    }

    .details dt {
      color: var(--mat-sys-on-surface-variant);
    }

    .details dd {
      margin: 0;
      overflow-wrap: anywhere;
    }

    /* server-computed §5.4 flag (FR-DUE-02) — visual only */
    .overdue {
      color: var(--mat-sys-error);
      font-weight: 600;
    }

    .overdue-badge {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      border-radius: 1rem;
      padding: 0.125rem 0.625rem;
      margin-left: 0.375rem;
      font-size: var(--mat-sys-label-small-size);
      white-space: nowrap;
    }
  `,
})
export class TicketCard {
  readonly ticket = input.required<TicketDto>();

  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly statusLabels = STATUS_LABELS;

  protected requester(): string {
    const { requesterName, requesterPhone } = this.ticket();
    const parts = [requesterName, requesterPhone].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }
}
