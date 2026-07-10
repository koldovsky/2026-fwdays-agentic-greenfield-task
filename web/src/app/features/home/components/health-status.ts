import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HealthDto } from '../data/health.model';

@Component({
  selector: 'app-health-status',
  imports: [MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <span class="row" role="status">
        <mat-spinner diameter="16" aria-label="Перевіряємо стан" />
        Перевіряємо стан сервісу…
      </span>
    } @else {
      <!-- plain @if, not @else if: fallow's template scan misses input
           reads inside an @else if expression (false "unused input") -->
      @if (health(); as h) {
        <span class="row" role="status">
          <span
            class="dot"
            [class.dot-ok]="h.status === 'ok'"
            [class.dot-error]="h.status !== 'ok'"
          ></span>
          @if (h.status === 'ok') {
            Сервіс працює, база даних доступна
          } @else {
            Сервіс недоступний (база даних:
            {{ h.db === 'up' ? 'доступна' : 'недоступна' }})
          }
        </span>
      }
    }
  `,
  styles: `
    .row {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dot {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 50%;
    }

    .dot-ok {
      /* M3 has no "success" system token; primary reads as the theme's
         healthy state (В-04: no hardcoded colors) */
      background: var(--mat-sys-primary);
    }

    .dot-error {
      background: var(--mat-sys-error);
    }
  `,
})
export class HealthStatus {
  readonly health = input<HealthDto | null>(null);
  readonly loading = input(false);
}
