import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { NonNullableFormBuilder } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

// Presentational (ADR-0009): note input for the append-only feed
// (FR-FEED-01). Emits the trimmed text; the container owns the API call and
// calls clear() once the note actually landed — a failed submit keeps the
// typed text.
@Component({
  selector: 'app-ticket-note-form',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- [formGroup] attaches FormGroupDirective — without it (ngSubmit)
         never fires and the button falls through to a native page-reloading
         submit (caught by the S-05 Playwright note scenario) -->
    <form class="form" [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-form-field appearance="outline" class="field">
        <mat-label>Новий запис</mat-label>
        <textarea
          matInput
          formControlName="text"
          rows="2"
          maxlength="10000"
        ></textarea>
        @if (showEmptyHint) {
          <mat-error>Введіть текст запису</mat-error>
        }
      </mat-form-field>
      <button matButton="filled" type="submit" [disabled]="pending()">
        Додати запис
      </button>
    </form>
  `,
  styles: `
    .form {
      display: grid;
      gap: 0.25rem;
      justify-items: end;
    }

    .field {
      width: 100%;
    }
  `,
})
export class TicketNoteForm {
  readonly pending = input(false);
  readonly submitted = output<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    text: '',
  });
  protected showEmptyHint = false;

  protected onSubmit(): void {
    const control = this.form.controls.text;
    // Validators.required does not trim — normalize before validating
    const value = control.value.trim();
    if (!value) {
      this.showEmptyHint = true;
      control.setErrors({ required: true });
      control.markAsTouched();
      return;
    }
    this.showEmptyHint = false;
    this.submitted.emit(value);
  }

  /** The container confirms the note landed; only then the field empties. */
  clear(): void {
    this.form.reset();
    this.form.controls.text.setErrors(null);
    this.showEmptyHint = false;
  }
}
