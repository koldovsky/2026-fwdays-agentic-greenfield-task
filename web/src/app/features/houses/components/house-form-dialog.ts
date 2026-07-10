import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  HOUSE_NAME_MAX,
  HOUSE_NOTE_MAX,
  HouseDto,
  HouseInput,
} from '../data/house.model';

export interface HouseFormData {
  /** absent → create, present → edit */
  house?: HouseDto;
}

// Closes with a HouseInput on save, undefined on cancel. The container owns
// the facade call; this dialog only collects a valid form value.
@Component({
  selector: 'app-house-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>
      {{ data.house ? 'Редагувати будинок' : 'Новий будинок' }}
    </h2>
    <form (submit)="onSave($event)">
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="field">
          <mat-label>Назва або адреса</mat-label>
          <input
            matInput
            type="text"
            placeholder="вул. Шевченка, 12"
            [formControl]="name"
            [maxlength]="nameMax"
          />
          @if (name.touched && name.invalid) {
            <mat-error>Вкажіть назву або адресу будинку</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="field">
          <mat-label>Примітка</mat-label>
          <textarea
            matInput
            rows="3"
            [formControl]="note"
            [maxlength]="noteMax"
          ></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" (click)="onCancel()">Скасувати</button>
        <button matButton="filled" type="submit">Зберегти</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .field {
      display: block;
      width: 100%;
      min-width: min(60vw, 20rem);
    }
  `,
})
export class HouseFormDialog {
  protected readonly data = inject<HouseFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<HouseFormDialog, HouseInput>>(MatDialogRef);

  protected readonly nameMax = HOUSE_NAME_MAX;
  protected readonly noteMax = HOUSE_NOTE_MAX;

  protected readonly name = new FormControl(this.data.house?.name ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(HOUSE_NAME_MAX)],
  });
  protected readonly note = new FormControl(this.data.house?.note ?? '', {
    nonNullable: true,
    validators: [Validators.maxLength(HOUSE_NOTE_MAX)],
  });

  protected onSave(event: Event): void {
    event.preventDefault();
    // Validators.required does not trim — normalize first so a
    // whitespace-only name fails inline instead of closing the dialog
    this.name.setValue(this.name.value.trim());
    if (this.name.invalid) {
      this.name.markAsTouched();
      return;
    }
    this.dialogRef.close({
      name: this.name.value,
      note: this.note.value.trim() || null,
    });
  }

  protected onCancel(): void {
    this.dialogRef.close();
  }
}
