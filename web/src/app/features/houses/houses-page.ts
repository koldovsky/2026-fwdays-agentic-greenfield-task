import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog, ConfirmData } from '../../shared/confirm-dialog';
import { HouseFormData, HouseFormDialog } from './components/house-form-dialog';
import { HouseList } from './components/house-list';
import { HouseDto, HouseInput } from './data/house.model';
import { HousesFacade } from './data/houses-facade';

// Container template = loading/content/error state machine; the branching
// is the page's whole job (ADR-0009), splitting further adds indirection.
// fallow-ignore-next-line complexity
@Component({
  selector: 'app-houses-page',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    RouterLink,
    HouseList,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar class="toolbar">
      <a matIconButton routerLink="/" aria-label="На головну">
        <mat-icon>arrow_back</mat-icon>
      </a>
      <span>Будинки</span>
    </mat-toolbar>
    <main class="content">
      @if (facade.loading() && !facade.loaded()) {
        <mat-spinner class="spinner" [diameter]="32" />
      } @else if (facade.loaded()) {
        <app-house-list
          [houses]="facade.houses()"
          [pending]="facade.pending()"
          (created)="onCreate()"
          (edited)="onEdit($event)"
          (deleted)="onDelete($event)"
        />
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
  `,
})
export class HousesPage implements OnInit {
  protected readonly facade = inject(HousesFacade);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    void this.facade.load();
  }

  protected onReload(): void {
    void this.facade.load();
  }

  protected async onCreate(): Promise<void> {
    const input = await this.openForm({});
    if (input) await this.runMutation(this.facade.create(input));
  }

  protected async onEdit(house: HouseDto): Promise<void> {
    const input = await this.openForm({ house });
    if (input) await this.runMutation(this.facade.update(house.id, input));
  }

  protected async onDelete(house: HouseDto): Promise<void> {
    const ref = this.dialog.open<ConfirmDialog, ConfirmData, boolean>(
      ConfirmDialog,
      {
        data: {
          title: `Видалити будинок «${house.name}»?`,
          confirmLabel: 'Видалити',
        },
      },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (confirmed) await this.runMutation(this.facade.remove(house.id));
  }

  private openForm(data: HouseFormData): Promise<HouseInput | undefined> {
    const ref = this.dialog.open<HouseFormDialog, HouseFormData, HouseInput>(
      HouseFormDialog,
      { data },
    );
    return firstValueFrom(ref.afterClosed());
  }

  // API refusals (validation, delete with tickets from S-04) → snackbar
  private async runMutation(result: Promise<boolean>): Promise<void> {
    const ok = await result;
    if (!ok) {
      this.snackBar.open(
        this.facade.error() ?? 'Щось пішло не так. Спробуйте ще раз',
        'OK',
        { duration: 5000 },
      );
    }
  }
}
