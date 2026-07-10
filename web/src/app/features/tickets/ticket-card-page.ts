import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmData, ConfirmDialog } from '../../shared/confirm-dialog';
import {
  AttachmentViewData,
  AttachmentViewDialog,
} from './components/attachment-view-dialog';
import { TicketActions } from './components/ticket-actions';
import { TicketAttachments } from './components/ticket-attachments';
import { TicketCard } from './components/ticket-card';
import { TicketFeed } from './components/ticket-feed';
import { TicketNoteForm } from './components/ticket-note-form';
import { TicketsFacade } from './data/tickets-facade';
import {
  AttachmentDto,
  TicketStatus,
  attachmentPrecheckError,
  attachmentUrl,
} from './data/ticket.model';

// Container: loads one ticket by the route id and shows its card, the
// allowed transition actions (FR-STATUS-02) and the feed with the note form
// (FR-FEED-01/02). Foreign/missing ids surface the facade's 404 message
// (FR-ACCESS-01).
// Container template = loading/content/error state machine; the branching
// is the page's whole job (ADR-0009), splitting further adds indirection.
// fallow-ignore-next-line complexity
@Component({
  selector: 'app-ticket-card-page',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    RouterLink,
    TicketActions,
    TicketAttachments,
    TicketCard,
    TicketFeed,
    TicketNoteForm,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar class="toolbar">
      <a matIconButton routerLink="/" aria-label="На головну">
        <mat-icon>arrow_back</mat-icon>
      </a>
      <span class="title">Заявка</span>
      @if (facade.ticket(); as ticket) {
        <a
          matIconButton
          [routerLink]="['/tickets', ticket.id, 'edit']"
          aria-label="Редагувати заявку"
        >
          <mat-icon>edit</mat-icon>
        </a>
      }
    </mat-toolbar>
    <main class="content">
      @if (facade.loading()) {
        <mat-spinner class="spinner" [diameter]="32" />
      } @else if (facade.ticket(); as ticket) {
        <app-ticket-card [ticket]="ticket" />
        <app-ticket-actions
          [status]="ticket.status"
          [allowedTransitions]="ticket.allowedTransitions"
          [pending]="facade.pending()"
          (transition)="onTransition(ticket.id, $event)"
        />
        <section class="feed" aria-label="Фото заявки">
          <h2 class="feed-title">Фото</h2>
          <app-ticket-attachments
            [attachments]="facade.attachments()"
            [ticketId]="ticket.id"
            [pending]="facade.pending()"
            (view)="onViewAttachment(ticket.id, $event)"
            (remove)="onRemoveAttachment(ticket.id, $event)"
            (filesPicked)="onFilesPicked(ticket.id, $event)"
          />
        </section>
        <section class="feed" aria-label="Стрічка заявки">
          <h2 class="feed-title">Стрічка</h2>
          <app-ticket-feed [items]="facade.feed()" />
          <app-ticket-note-form
            [pending]="facade.pending()"
            (submitted)="onAddNote(ticket.id, $event)"
          />
        </section>
      } @else if (facade.error(); as error) {
        <section class="empty">
          <p role="alert">{{ error }}</p>
          <button matButton="filled" type="button" (click)="onReload()">
            Спробувати ще раз
          </button>
        </section>
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

    .empty {
      text-align: center;
      margin-top: 2rem;
      display: grid;
      gap: 1rem;
      justify-items: center;
      color: var(--mat-sys-on-surface-variant);
    }

    .feed {
      display: grid;
      gap: 0.75rem;
    }

    .feed-title {
      font-size: var(--mat-sys-title-medium-size);
      margin: 0;
    }
  `,
})
export class TicketCardPage {
  protected readonly facade = inject(TicketsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly noteForm = viewChild(TicketNoteForm);

  // reactive, not route.snapshot: the router reuses the component instance
  // when only :id changes (S-04 review, medium finding)
  private readonly params = toSignal(this.route.paramMap);
  private readonly ticketId = computed(() => Number(this.params()?.get('id')));

  constructor() {
    effect(() => void this.facade.load(this.ticketId()));
  }

  protected onReload(): void {
    void this.facade.load(this.ticketId());
  }

  protected async onTransition(id: number, to: TicketStatus): Promise<void> {
    const ok = await this.facade.transition(id, to);
    if (!ok) this.showError();
  }

  protected async onAddNote(id: number, text: string): Promise<void> {
    const ok = await this.facade.addNote(id, text);
    // the field empties only when the note actually landed in the feed
    if (ok) this.noteForm()?.clear();
    else this.showError();
  }

  // Sequential upload (S-07 design D7): pre-check each file for instant
  // feedback (the API stays the enforcement point), stop on the first
  // failure — client-rejected or API-rejected alike.
  protected async onFilesPicked(id: number, files: File[]): Promise<void> {
    for (const file of files) {
      const precheck = attachmentPrecheckError(
        file,
        this.facade.attachments().length,
      );
      if (precheck) {
        this.snackBar.open(precheck, 'OK', { duration: 5000 });
        return;
      }
      const ok = await this.facade.uploadAttachment(id, file);
      if (!ok) {
        this.showError();
        return;
      }
    }
  }

  protected onViewAttachment(id: number, attachment: AttachmentDto): void {
    this.dialog.open<AttachmentViewDialog, AttachmentViewData>(
      AttachmentViewDialog,
      {
        data: {
          url: attachmentUrl(id, attachment.id),
          fileName: attachment.fileName,
        },
        maxWidth: '95vw',
      },
    );
  }

  protected async onRemoveAttachment(
    id: number,
    attachment: AttachmentDto,
  ): Promise<void> {
    const ref = this.dialog.open<ConfirmDialog, ConfirmData, boolean>(
      ConfirmDialog,
      {
        data: {
          title: `Видалити фото «${attachment.fileName}»?`,
          confirmLabel: 'Видалити',
        },
      },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (confirmed && !(await this.facade.deleteAttachment(id, attachment.id))) {
      this.showError();
    }
  }

  private showError(): void {
    const error = this.facade.error();
    if (error) this.snackBar.open(error, 'OK', { duration: 5000 });
  }
}
