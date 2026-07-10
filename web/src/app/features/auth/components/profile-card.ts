import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserDto } from '../data/auth.model';

// Presentational: minimal profile — phone (read-only), optional name,
// logout («Вийти», FR-AUTH-04).
@Component({
  selector: 'app-profile-card',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card appearance="outlined">
      <mat-card-header>
        <mat-card-title>Профіль</mat-card-title>
        <mat-card-subtitle>{{ user().phone }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <form class="row" (submit)="onSave($event)">
          <mat-form-field appearance="outline" class="name-field">
            <mat-label>Імʼя (необовʼязково)</mat-label>
            <input matInput type="text" [formControl]="name" />
            @if (name.invalid) {
              <mat-error>Імʼя — до 120 символів</mat-error>
            }
          </mat-form-field>
          <button
            matButton="tonal"
            type="submit"
            [disabled]="pending() || name.invalid || !nameChanged()"
          >
            Зберегти
          </button>
        </form>
      </mat-card-content>
      <mat-card-actions>
        <button matButton type="button" (click)="loggedOut.emit()">
          Вийти
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    .row {
      display: flex;
      gap: 0.75rem;
      align-items: baseline;
      flex-wrap: wrap;
    }

    .name-field {
      flex: 1 1 12rem;
    }
  `,
})
export class ProfileCard {
  readonly user = input.required<UserDto>();
  readonly pending = input(false);
  readonly nameSaved = output<string | null>();
  readonly loggedOut = output<void>();

  protected readonly name = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(120)],
  });

  constructor() {
    effect(() => {
      this.name.setValue(this.user().name ?? '');
    });
  }

  protected nameChanged(): boolean {
    return this.name.value.trim() !== (this.user().name ?? '');
  }

  protected onSave(event: Event): void {
    event.preventDefault();
    if (this.name.invalid) return;
    this.nameSaved.emit(this.name.value.trim() || null);
  }
}
