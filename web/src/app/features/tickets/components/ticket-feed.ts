import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { eventText } from '../data/ticket-labels';
import { FeedItemDto } from '../data/ticket.model';

// Presentational (ADR-0009): the single chronological feed (PRD §5.5) —
// user notes as speech-bubble cards, system events as muted one-liners with
// an icon, visually distinct by requirement (FR-FEED-02). Every item shows
// its author and date-time (FR-FEED-01).
@Component({
  selector: 'app-ticket-feed',
  imports: [DatePipe, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length === 0) {
      <p class="empty">Записів ще немає</p>
    } @else {
      <ol class="feed">
        @for (item of items(); track item.id) {
          @if (item.type === 'NOTE') {
            <li class="note">
              <p class="text">{{ item.text }}</p>
              <footer class="meta">
                {{ item.authorName }} ·
                {{ item.createdAt | date: 'dd.MM.yyyy HH:mm' }}
              </footer>
            </li>
          } @else {
            <li class="event">
              <mat-icon class="icon" aria-hidden="true">history</mat-icon>
              <span class="text">{{ eventText(item) }}</span>
              <footer class="meta">
                {{ item.authorName }} ·
                {{ item.createdAt | date: 'dd.MM.yyyy HH:mm' }}
              </footer>
            </li>
          }
        }
      </ol>
    }
  `,
  styles: `
    .empty {
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
      margin: 0;
    }

    .feed {
      list-style: none;
      display: grid;
      gap: 0.75rem;
      margin: 0;
      padding: 0;
    }

    .note {
      background: var(--mat-sys-surface-container);
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
    }

    .note .text {
      margin: 0;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }

    .event {
      display: grid;
      grid-template-columns: auto 1fr;
      column-gap: 0.5rem;
      align-items: center;
      color: var(--mat-sys-on-surface-variant);
      font-size: var(--mat-sys-body-small-size);
    }

    .event .icon {
      font-size: 1.125rem;
      width: 1.125rem;
      height: 1.125rem;
    }

    .event .text {
      overflow-wrap: anywhere;
    }

    .meta {
      color: var(--mat-sys-on-surface-variant);
      font-size: var(--mat-sys-label-small-size);
      margin-top: 0.25rem;
    }

    .event .meta {
      grid-column: 2;
    }
  `,
})
export class TicketFeed {
  readonly items = input.required<FeedItemDto[]>();

  protected readonly eventText = eventText;
}
