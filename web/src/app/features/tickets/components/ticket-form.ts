import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  input,
  output,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { HouseDto } from '../../houses/data/house.model';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from '../data/ticket-labels';
import {
  TICKET_DESCRIPTION_MAX,
  TICKET_EXECUTOR_MAX,
  TICKET_REQUESTER_NAME_MAX,
  TICKET_REQUESTER_PHONE_MAX,
  TICKET_TITLE_MAX,
  TicketCategory,
  TicketDto,
  TicketInput,
  TicketPriority,
  fromWireDate,
  toWireDate,
} from '../data/ticket.model';

const trimmedOrNull = (control: FormControl<string>): string | null =>
  control.value.trim() || null;

const orEmpty = (value: string | null): string => value ?? '';

// Presentational (ADR-0009): collects a valid TicketInput and emits it on
// save; the container owns the facade call and navigation. Prefill comes in
// through the `ticket` input (edit mode).
// Template branching = the form itself (option loops, inline errors, the
// clear-date affordance) — irreducible for a 9-field form (S-03 precedent).
// fallow-ignore-next-line complexity
@Component({
  selector: 'app-ticket-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="form" (submit)="onSave($event)">
      <mat-form-field appearance="outline">
        <mat-label>Назва</mat-label>
        <input
          matInput
          type="text"
          placeholder="Тече кран у під’їзді"
          [formControl]="title"
          [maxlength]="titleMax"
        />
        <mat-error>Вкажіть назву заявки</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Будинок</mat-label>
        <mat-select [formControl]="houseId">
          @for (house of houses(); track house.id) {
            <mat-option [value]="house.id">{{ house.name }}</mat-option>
          }
        </mat-select>
        <mat-error>Оберіть будинок</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Категорія</mat-label>
        <mat-select [formControl]="category">
          @for (option of categoryOptions; track option.value) {
            <mat-option [value]="option.value">{{ option.label }}</mat-option>
          }
        </mat-select>
        <mat-error>Оберіть категорію</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Пріоритет</mat-label>
        <mat-select [formControl]="priority">
          @for (option of priorityOptions; track option.value) {
            <mat-option [value]="option.value">{{ option.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Цільовий термін</mat-label>
        <input matInput [matDatepicker]="picker" [formControl]="dueDate" />
        @if (dueDate.value) {
          <button
            matIconButton
            matSuffix
            type="button"
            aria-label="Очистити термін"
            (click)="dueDate.setValue(null)"
          >
            <mat-icon>close</mat-icon>
          </button>
        }
        <mat-datepicker-toggle matSuffix [for]="picker" />
        <mat-datepicker #picker />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Виконавець</mat-label>
        <input
          matInput
          type="text"
          [formControl]="executor"
          [maxlength]="executorMax"
        />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>ПІБ заявника</mat-label>
        <input
          matInput
          type="text"
          [formControl]="requesterName"
          [maxlength]="requesterNameMax"
        />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Телефон заявника</mat-label>
        <input
          matInput
          type="tel"
          [formControl]="requesterPhone"
          [maxlength]="requesterPhoneMax"
        />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Опис</mat-label>
        <textarea
          matInput
          rows="4"
          [formControl]="description"
          [maxlength]="descriptionMax"
        ></textarea>
      </mat-form-field>

      <div class="actions">
        <button matButton type="button" (click)="cancelled.emit()">
          Скасувати
        </button>
        <button matButton="filled" type="submit" [disabled]="pending()">
          Зберегти
        </button>
      </div>
    </form>
  `,
  styles: `
    .form {
      display: grid;
      gap: 0.25rem;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  `,
})
export class TicketForm implements OnInit {
  readonly houses = input.required<HouseDto[]>();
  /** absent → create, present → edit prefill */
  readonly ticket = input<TicketDto | null>(null);
  readonly pending = input(false);
  readonly saved = output<TicketInput>();
  readonly cancelled = output<void>();

  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly priorityOptions = PRIORITY_OPTIONS;
  protected readonly titleMax = TICKET_TITLE_MAX;
  protected readonly descriptionMax = TICKET_DESCRIPTION_MAX;
  protected readonly executorMax = TICKET_EXECUTOR_MAX;
  protected readonly requesterNameMax = TICKET_REQUESTER_NAME_MAX;
  protected readonly requesterPhoneMax = TICKET_REQUESTER_PHONE_MAX;

  protected readonly title = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(TICKET_TITLE_MAX)],
  });
  protected readonly houseId = new FormControl<number | null>(null, {
    validators: [Validators.required],
  });
  protected readonly category = new FormControl<TicketCategory | null>(null, {
    validators: [Validators.required],
  });
  protected readonly priority = new FormControl<TicketPriority>('NORMAL', {
    nonNullable: true,
  });
  protected readonly dueDate = new FormControl<Date | null>(null);
  protected readonly executor = new FormControl('', { nonNullable: true });
  protected readonly requesterName = new FormControl('', {
    nonNullable: true,
  });
  protected readonly requesterPhone = new FormControl('', {
    nonNullable: true,
  });
  protected readonly description = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    const ticket = this.ticket();
    if (!ticket) return;
    this.title.setValue(ticket.title);
    this.houseId.setValue(ticket.houseId);
    this.category.setValue(ticket.category);
    this.priority.setValue(ticket.priority);
    this.dueDate.setValue(fromWireDate(ticket.dueDate));
    this.executor.setValue(orEmpty(ticket.executor));
    this.requesterName.setValue(orEmpty(ticket.requesterName));
    this.requesterPhone.setValue(orEmpty(ticket.requesterPhone));
    this.description.setValue(orEmpty(ticket.description));
  }

  // Validators.required does not trim — normalize first so a
  // whitespace-only title fails inline instead of being submitted
  private requiredValid(): boolean {
    this.title.setValue(this.title.value.trim());
    const required = [this.title, this.houseId, this.category];
    for (const control of required) control.markAsTouched();
    return required.every((control) => control.valid);
  }

  protected onSave(event: Event): void {
    event.preventDefault();
    const houseId = this.houseId.value;
    const category = this.category.value;
    if (!this.requiredValid() || houseId === null || category === null) return;
    this.saved.emit({
      title: this.title.value,
      houseId,
      category,
      priority: this.priority.value,
      dueDate: toWireDate(this.dueDate.value),
      executor: trimmedOrNull(this.executor),
      requesterName: trimmedOrNull(this.requesterName),
      requesterPhone: trimmedOrNull(this.requesterPhone),
      description: trimmedOrNull(this.description),
    });
  }
}
