import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginPage } from './login-page';
import { AuthFacade } from './data/auth-facade';

type FacadeMock = {
  pending: ReturnType<typeof signal<boolean>>;
  error: ReturnType<typeof signal<string | null>>;
  codeRequested: ReturnType<typeof signal<boolean>>;
  requestOtp: ReturnType<typeof vi.fn>;
  verifyOtp: ReturnType<typeof vi.fn>;
  resetLogin: ReturnType<typeof vi.fn>;
};

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let facade: FacadeMock;

  beforeEach(async () => {
    facade = {
      pending: signal(false),
      error: signal<string | null>(null),
      codeRequested: signal(false),
      requestOtp: vi.fn().mockResolvedValue(undefined),
      verifyOtp: vi.fn().mockResolvedValue(false),
      resetLogin: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: AuthFacade, useValue: facade }],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
  });

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  async function submitPhone(value: string): Promise<void> {
    const input = el().querySelector<HTMLInputElement>('input');
    if (!input) throw new Error('phone input not rendered');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    el().querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('starts on the phone step', () => {
    expect(el().textContent).toContain('Номер телефону');
    expect(el().textContent).not.toContain('Код з SMS');
  });

  it('does not request a code for an invalid phone and shows validation', async () => {
    await submitPhone('12345');
    expect(facade.requestOtp).not.toHaveBeenCalled();
    expect(el().textContent).toContain('Введіть номер у форматі +380');
  });

  it('requests a code for a valid phone', async () => {
    await submitPhone('+380671234567');
    expect(facade.requestOtp).toHaveBeenCalledWith('+380671234567');
  });

  it('switches to the code step and verifies the entered code', async () => {
    facade.codeRequested.set(true);
    await fixture.whenStable();
    expect(el().textContent).toContain('Код з SMS');

    const input = el().querySelector<HTMLInputElement>('input');
    if (!input) throw new Error('code input not rendered');
    input.value = '123456';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    el().querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(facade.verifyOtp).toHaveBeenCalledWith('', '123456');
  });

  it('renders the facade error as an alert (rate limit copy)', async () => {
    facade.error.set('Зачекайте хвилину, перш ніж запитати новий код');
    await fixture.whenStable();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain(
      'Зачекайте хвилину',
    );
  });
});
