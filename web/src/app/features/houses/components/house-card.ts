import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { HouseDto } from '../data/house.model';

@Component({
  selector: 'app-house-card',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card appearance="outlined">
      <mat-card-header>
        <mat-card-title>{{ house().name }}</mat-card-title>
      </mat-card-header>
      @if (house().note; as note) {
        <mat-card-content>
          <p class="note">{{ note }}</p>
        </mat-card-content>
      }
      <mat-card-actions align="end">
        <button
          matIconButton
          type="button"
          [disabled]="pending()"
          aria-label="Редагувати будинок"
          (click)="edited.emit()"
        >
          <mat-icon>edit</mat-icon>
        </button>
        <button
          matIconButton
          type="button"
          [disabled]="pending()"
          aria-label="Видалити будинок"
          (click)="deleted.emit()"
        >
          <mat-icon>delete</mat-icon>
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    .note {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      white-space: pre-line;
    }
  `,
})
export class HouseCard {
  readonly house = input.required<HouseDto>();
  readonly pending = input(false);
  readonly edited = output<void>();
  readonly deleted = output<void>();
}
