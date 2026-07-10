import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HouseDto } from '../data/house.model';
import { HouseCard } from './house-card';

@Component({
  selector: 'app-house-list',
  imports: [MatButtonModule, MatIconModule, HouseCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      matButton="filled"
      type="button"
      class="add"
      (click)="created.emit()"
    >
      <mat-icon>add</mat-icon>
      Додати будинок
    </button>
    @for (house of houses(); track house.id) {
      <app-house-card
        [house]="house"
        [pending]="pending()"
        (edited)="edited.emit(house)"
        (deleted)="deleted.emit(house)"
      />
    } @empty {
      <section class="empty">
        <p>
          У довіднику поки порожньо. Додайте перший будинок — до нього
          прив’язуватимуться заявки.
        </p>
      </section>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 1rem;
    }

    .add {
      justify-self: start;
    }

    .empty {
      text-align: center;
      margin-top: 2rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class HouseList {
  readonly houses = input.required<HouseDto[]>();
  readonly pending = input(false);
  readonly created = output<void>();
  readonly edited = output<HouseDto>();
  readonly deleted = output<HouseDto>();
}
