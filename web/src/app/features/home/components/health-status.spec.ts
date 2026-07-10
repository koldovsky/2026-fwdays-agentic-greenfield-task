import { TestBed } from '@angular/core/testing';
import { HealthStatus } from './health-status';

describe('HealthStatus', () => {
  async function render(inputs: {
    health: { status: string; db: string } | null;
    loading: boolean;
  }): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [HealthStatus],
    }).compileComponents();
    const fixture = TestBed.createComponent(HealthStatus);
    fixture.componentRef.setInput('health', inputs.health);
    fixture.componentRef.setInput('loading', inputs.loading);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the loading state', async () => {
    const el = await render({ health: null, loading: true });
    expect(el.textContent).toContain('Перевіряємо стан сервісу');
  });

  it('shows the ok state when the service is healthy', async () => {
    const el = await render({
      health: { status: 'ok', db: 'up' },
      loading: false,
    });
    expect(el.textContent).toContain('Сервіс працює');
    expect(el.querySelector('.dot-ok')).toBeTruthy();
  });

  it('shows the error state when the service is down', async () => {
    const el = await render({
      health: { status: 'error', db: 'down' },
      loading: false,
    });
    expect(el.textContent).toContain('Сервіс недоступний');
    expect(el.querySelector('.dot-error')).toBeTruthy();
  });
});
