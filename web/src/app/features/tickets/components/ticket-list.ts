import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../data/ticket-labels';
import { TicketListItemDto } from '../data/ticket.model';

// Presentational rows with the FR-LIST-01 columns; each row links to the
// card. Overdue rows carry the server-computed flag (FR-DUE-02) rendered
// with error tokens only — no client-side §5.4 rule.
@Component({
  selector: 'app-ticket-list',
  imports: [DatePipe, MatButtonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length === 0) {
      <p class="empty">
        Нічого не знайдено. Змініть фільтри чи пошук — або створіть нову заявку.
      </p>
    } @else {
      <ul class="rows">
        @for (item of items(); track item.id) {
          <li>
            <a
              class="row"
              [class.overdue]="item.isOverdue"
              [routerLink]="['/tickets', item.id]"
            >
              <div class="top">
                <span class="number">#{{ item.id }}</span>
                <span class="title">{{ item.title }}</span>
                <span class="status">{{ statusLabels[item.status] }}</span>
              </div>
              <div class="meta">
                {{ item.houseName }} · {{ categoryLabels[item.category] }} ·
                {{ priorityLabels[item.priority] }}
              </div>
              <div class="dates">
                <span>Створено {{ item.createdAt | date: 'dd.MM.yyyy' }}</span>
                @if (item.dueDate) {
                  <!-- no timezone arg, same as the card: a date-only ISO
                       string renders as the local calendar date -->
                  <span class="due" [class.due-overdue]="item.isOverdue">
                    Термін {{ item.dueDate | date: 'dd.MM.yyyy' }}
                    @if (item.isOverdue) {
                      — прострочено
                    }
                  </span>
                }
              </div>
            </a>
          </li>
        }
      </ul>
      @if (hasMore()) {
        <button
          matButton="outlined"
          type="button"
          class="more"
          [disabled]="loadingMore()"
          (click)="more.emit()"
        >
          Показати ще
        </button>
      }
    }
  `,
  styles: `
    .empty {
      text-align: center;
      margin-top: 2rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .rows {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.5rem;
    }

    .row {
      display: grid;
      gap: 0.25rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.75rem;
      text-decoration: none;
      color: var(--mat-sys-on-surface);
      background: var(--mat-sys-surface);
    }

    .row:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
    }

    .row.overdue {
      border-left: 4px solid var(--mat-sys-error);
    }

    .top {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .number {
      color: var(--mat-sys-on-surface-variant);
    }

    .title {
      font-weight: 500;
      flex: 1;
      overflow-wrap: anywhere;
    }

    .status {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      border-radius: 1rem;
      padding: 0.125rem 0.625rem;
      font-size: var(--mat-sys-label-medium-size);
      white-space: nowrap;
    }

    .meta,
    .dates {
      font-size: var(--mat-sys-body-small-size);
      color: var(--mat-sys-on-surface-variant);
    }

    .dates {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1rem;
    }

    .due-overdue {
      color: var(--mat-sys-error);
      font-weight: 600;
    }

    .more {
      justify-self: center;
      margin-top: 1rem;
    }

    :host {
      display: grid;
    }
  `,
})
export class TicketList {
  readonly items = input.required<TicketListItemDto[]>();
  readonly hasMore = input.required<boolean>();
  readonly loadingMore = input.required<boolean>();
  readonly more = output<void>();

  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
}
