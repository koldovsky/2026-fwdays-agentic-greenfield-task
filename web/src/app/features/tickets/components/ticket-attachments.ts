import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_PER_TICKET,
  AttachmentDto,
  attachmentUrl,
} from '../data/ticket.model';

// Presentational (ADR-0009): the card's photo section (FR-ATTACH-02) —
// thumbnail grid (CSS-scaled originals, S-07 non-goal: no server thumbnails),
// upload via a hidden file input with the Р-13 accept filter, delete per
// photo. View/delete/files-picked go up as outputs; the container owns the
// dialogs and the facade calls.
@Component({
  selector: 'app-ticket-attachments',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (attachments().length === 0) {
      <p class="empty">Фото ще немає</p>
    } @else {
      <ul class="grid">
        @for (attachment of attachments(); track attachment.id) {
          <li class="cell">
            <button
              class="thumb"
              type="button"
              (click)="view.emit(attachment)"
              [attr.aria-label]="'Відкрити фото ' + attachment.fileName"
            >
              <img
                class="image"
                [src]="url(attachment)"
                [alt]="attachment.fileName"
                loading="lazy"
              />
            </button>
            <button
              matIconButton
              class="delete"
              type="button"
              [disabled]="pending()"
              (click)="remove.emit(attachment)"
              [attr.aria-label]="'Видалити фото ' + attachment.fileName"
            >
              <mat-icon>delete</mat-icon>
            </button>
          </li>
        }
      </ul>
    }
    <input
      #fileInput
      class="file-input"
      type="file"
      [accept]="accept"
      multiple
      (change)="onFilesPicked(fileInput)"
    />
    <button
      matButton="tonal"
      type="button"
      [disabled]="pending() || attachments().length >= maxPerTicket"
      (click)="fileInput.click()"
    >
      <mat-icon>add_a_photo</mat-icon>
      Додати фото
    </button>
  `,
  styles: `
    :host {
      display: grid;
      gap: 0.75rem;
      justify-items: start;
    }

    .empty {
      color: var(--mat-sys-on-surface-variant);
      margin: 0;
    }

    .grid {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
      gap: 0.5rem;
      width: 100%;
    }

    .cell {
      position: relative;
    }

    .thumb {
      display: block;
      width: 100%;
      padding: 0;
      border: none;
      border-radius: 0.5rem;
      overflow: hidden;
      cursor: pointer;
      background: var(--mat-sys-surface-container);
    }

    .image {
      display: block;
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
    }

    .delete {
      position: absolute;
      top: 0.125rem;
      right: 0.125rem;
      background: var(--mat-sys-surface-container-high);
    }

    .file-input {
      display: none;
    }
  `,
})
export class TicketAttachments {
  readonly attachments = input.required<AttachmentDto[]>();
  readonly ticketId = input.required<number>();
  readonly pending = input(false);

  readonly view = output<AttachmentDto>();
  readonly remove = output<AttachmentDto>();
  readonly filesPicked = output<File[]>();

  protected readonly accept = ATTACHMENT_ACCEPT;
  protected readonly maxPerTicket = ATTACHMENT_MAX_PER_TICKET;

  protected url(attachment: AttachmentDto): string {
    return attachmentUrl(this.ticketId(), attachment.id);
  }

  // Clearing the value lets the user re-pick the same file after a failed
  // or deleted upload — a same-name pick would not re-fire `change`.
  protected onFilesPicked(inputEl: HTMLInputElement): void {
    const files = Array.from(inputEl.files ?? []);
    inputEl.value = '';
    if (files.length > 0) this.filesPicked.emit(files);
  }
}
