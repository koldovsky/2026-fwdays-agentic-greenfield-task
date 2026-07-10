import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatChipListboxChange, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { HouseDto } from '../../houses/data/house.model';
import {
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from '../data/ticket-labels';
import {
  TicketListFilters,
  TicketListOrder,
  TicketListSort,
  TicketStatusFilter,
} from '../data/ticket.model';

// Sort control folds the two API params into one select value (FR-LIST-04)
const SORT_OPTIONS: Array<{
  value: `${TicketListSort}:${TicketListOrder}`;
  label: string;
}> = [
  { value: 'createdAt:desc', label: 'Спочатку нові' },
  { value: 'createdAt:asc', label: 'Спочатку старі' },
  { value: 'dueDate:asc', label: 'Термін: найближчі' },
  { value: 'dueDate:desc', label: 'Термін: найдальші' },
];

// Presentational filter bar (ADR-0009): current filters in, one `changed`
// event out with the full next filter state — the container owns the URL.
// The «активні» preset is just one more status option (FR-LIST-02); its
// expansion lives server-side.
@Component({
  selector: 'app-ticket-filters',
  imports: [
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="filters">
      <mat-chip-listbox
        class="statuses"
        aria-label="Фільтр за статусом"
        [value]="filters().status"
        (change)="onStatus($event)"
      >
        <mat-chip-option value="ACTIVE">Активні</mat-chip-option>
        @for (option of statusOptions; track option.value) {
          <mat-chip-option [value]="option.value">
            {{ option.label }}
          </mat-chip-option>
        }
      </mat-chip-listbox>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-icon matPrefix>search</mat-icon>
        <input
          matInput
          type="search"
          placeholder="Пошук: назва, опис, заявник, виконавець"
          aria-label="Пошук заявок"
          #search
          [value]="filters().q"
          (input)="onSearch(search.value)"
        />
      </mat-form-field>
      <div class="selects">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Будинок</mat-label>
          <mat-select
            [value]="filters().houseId"
            (selectionChange)="emit({ houseId: $event.value })"
          >
            <mat-option [value]="null">Всі будинки</mat-option>
            @for (house of houses(); track house.id) {
              <mat-option [value]="house.id">{{ house.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Категорія</mat-label>
          <mat-select
            [value]="filters().category"
            (selectionChange)="emit({ category: $event.value })"
          >
            <mat-option [value]="null">Всі категорії</mat-option>
            @for (option of categoryOptions; track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Пріоритет</mat-label>
          <mat-select
            [value]="filters().priority"
            (selectionChange)="emit({ priority: $event.value })"
          >
            <mat-option [value]="null">Всі пріоритети</mat-option>
            @for (option of priorityOptions; track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Сортування</mat-label>
          <mat-select
            [value]="sortValue()"
            (selectionChange)="onSort($event.value)"
          >
            @for (option of sortOptions; track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
    </section>
  `,
  styles: `
    .filters {
      display: grid;
      gap: 0.75rem;
    }

    .selects {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
      gap: 0.5rem;
    }
  `,
})
export class TicketFilters {
  readonly filters = input.required<TicketListFilters>();
  readonly houses = input.required<HouseDto[]>();
  readonly changed = output<TicketListFilters>();

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly priorityOptions = PRIORITY_OPTIONS;
  protected readonly sortOptions = SORT_OPTIONS;

  // typing pauses for 300 ms before the search hits the URL (design D8)
  private readonly searchInput = new Subject<string>();

  constructor() {
    this.searchInput
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.emit({ q }));
  }

  protected sortValue(): string {
    const { sort, order } = this.filters();
    return `${sort}:${order}`;
  }

  protected onStatus(event: MatChipListboxChange): void {
    // deselecting the active chip yields undefined — that is «всі статуси»
    this.emit({ status: (event.value as TicketStatusFilter) ?? null });
  }

  protected onSearch(value: string): void {
    this.searchInput.next(value.trim());
  }

  protected onSort(value: string): void {
    const [sort, order] = value.split(':') as [TicketListSort, TicketListOrder];
    this.emit({ sort, order });
  }

  protected emit(patch: Partial<TicketListFilters>): void {
    this.changed.emit({ ...this.filters(), ...patch });
  }
}
