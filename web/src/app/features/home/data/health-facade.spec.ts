import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HealthApi } from './health-api';
import { HealthFacade } from './health-facade';

describe('HealthFacade', () => {
  function setup(api: Pick<HealthApi, 'check'>): HealthFacade {
    TestBed.configureTestingModule({
      providers: [{ provide: HealthApi, useValue: api }],
    });
    return TestBed.inject(HealthFacade);
  }

  it('exposes the health payload after a successful load', async () => {
    const facade = setup({ check: () => of({ status: 'ok', db: 'up' }) });

    await facade.load();

    expect(facade.health()).toEqual({ status: 'ok', db: 'up' });
    expect(facade.loading()).toBe(false);
  });

  it('keeps the API-shaped body when the API answers 503', async () => {
    const error = new HttpErrorResponse({
      status: 503,
      error: { status: 'error', db: 'down' },
    });
    const facade = setup({ check: () => throwError(() => error) });

    await facade.load();

    expect(facade.health()).toEqual({ status: 'error', db: 'down' });
    expect(facade.loading()).toBe(false);
  });

  it('collapses unknown failures to the generic error state', async () => {
    const facade = setup({
      check: () => throwError(() => new Error('network down')),
    });

    await facade.load();

    expect(facade.health()).toEqual({ status: 'error', db: 'down' });
  });
});
