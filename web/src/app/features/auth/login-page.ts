import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthFacade } from './data/auth-facade';

// Accepts what the API normalizes (design D10): +380…, 380…, 0…
const PHONE_PATTERN = /^\s*(\+?380|0)[\s\-()]*(\d[\s\-()]*){9}$/;

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="content">
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title>Вхід до Сервіс-деску</mat-card-title>
          <mat-card-subtitle>
            @if (facade.codeRequested()) {
              Ми надіслали SMS із кодом на {{ phone.value }}
            } @else {
              Введіть номер телефону — ми надішлемо SMS із кодом входу
            }
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (!facade.codeRequested()) {
            <form (submit)="onRequestCode($event)">
              <mat-form-field appearance="outline" class="field">
                <mat-label>Номер телефону</mat-label>
                <input
                  matInput
                  type="tel"
                  autocomplete="tel"
                  placeholder="+380 67 123 45 67"
                  [formControl]="phone"
                />
                @if (phone.touched && phone.invalid) {
                  <mat-error>Введіть номер у форматі +380…</mat-error>
                }
              </mat-form-field>
              <button
                matButton="filled"
                type="submit"
                class="submit"
                [disabled]="facade.pending()"
              >
                Отримати код
              </button>
            </form>
          } @else {
            <form (submit)="onVerify($event)">
              <mat-form-field appearance="outline" class="field">
                <mat-label>Код з SMS</mat-label>
                <input
                  matInput
                  type="text"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength="6"
                  [formControl]="code"
                />
                @if (code.touched && code.invalid) {
                  <mat-error>Код — 6 цифр</mat-error>
                }
              </mat-form-field>
              <button
                matButton="filled"
                type="submit"
                class="submit"
                [disabled]="facade.pending()"
              >
                Увійти
              </button>
              <div class="secondary-actions">
                <button
                  matButton
                  type="button"
                  [disabled]="facade.pending()"
                  (click)="onRequestAgain()"
                >
                  Надіслати код ще раз
                </button>
                <button matButton type="button" (click)="onChangePhone()">
                  Змінити номер
                </button>
              </div>
            </form>
          }
          @if (facade.error(); as error) {
            <p class="error" role="alert">{{ error }}</p>
          }
        </mat-card-content>
      </mat-card>
    </main>
  `,
  styles: `
    .content {
      max-width: 26rem;
      margin: 0 auto;
      padding: 1rem;
    }

    .field,
    .submit {
      display: block;
      width: 100%;
    }

    .submit {
      margin-top: 0.5rem;
    }

    .secondary-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      margin-top: 0.75rem;
    }

    .error {
      margin: 1rem 0 0;
      color: var(--mat-sys-error);
    }
  `,
})
export class LoginPage {
  protected readonly facade = inject(AuthFacade);
  private readonly router = inject(Router);

  protected readonly phone = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(PHONE_PATTERN)],
  });
  protected readonly code = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });

  protected onRequestCode(event: Event): void {
    event.preventDefault();
    if (this.phone.invalid) {
      this.phone.markAsTouched();
      return;
    }
    void this.facade.requestOtp(this.phone.value);
  }

  protected onRequestAgain(): void {
    void this.facade.requestOtp(this.phone.value);
  }

  protected async onVerify(event: Event): Promise<void> {
    event.preventDefault();
    if (this.code.invalid) {
      this.code.markAsTouched();
      return;
    }
    const loggedIn = await this.facade.verifyOtp(
      this.phone.value,
      this.code.value,
    );
    if (loggedIn) {
      await this.router.navigate(['/']);
    }
  }

  protected onChangePhone(): void {
    this.code.reset();
    this.facade.resetLogin();
  }
}
