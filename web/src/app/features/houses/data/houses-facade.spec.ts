import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HousesApi } from './houses-api';
import { HousesFacade } from './houses-facade';
import { HouseDto } from './house.model';

const HOUSE: HouseDto = {
  id: 1,
  name: 'Шевченка 12',
  note: null,
  createdAt: '2026-07-08T00:00:00.000Z',
  updatedAt: '2026-07-08T00:00:00.000Z',
};

function apiError(status: number, code: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { code, message: code } });
}

function setup(api: Partial<HousesApi>): HousesFacade {
  TestBed.configureTestingModule({
    providers: [{ provide: HousesApi, useValue: api }],
  });
  return TestBed.inject(HousesFacade);
}

describe('HousesFacade', () => {
  it('load fills the list and flips loaded (FR-HOUSE-01)', async () => {
    const facade = setup({ list: () => of([HOUSE]) });
    expect(facade.loaded()).toBe(false);
    await facade.load();
    expect(facade.houses()).toEqual([HOUSE]);
    expect(facade.loaded()).toBe(true);
    expect(facade.loading()).toBe(false);
  });

  it('load failure exposes Ukrainian copy and keeps loaded false', async () => {
    const facade = setup({
      list: () => throwError(() => apiError(500, 'BOOM')),
    });
    await facade.load();
    expect(facade.loaded()).toBe(false);
    expect(facade.error()).toContain('Щось пішло не так');
  });

  it('create reloads the list after success (reload-after-mutation)', async () => {
    let lists = 0;
    const facade = setup({
      list: () => {
        lists += 1;
        return of([HOUSE]);
      },
      create: () => of(HOUSE),
    });
    await expect(
      facade.create({ name: 'Шевченка 12', note: null }),
    ).resolves.toBe(true);
    expect(lists).toBe(1);
    expect(facade.houses()).toEqual([HOUSE]);
    expect(facade.error()).toBeNull();
  });

  it('create failure maps the API code to Ukrainian copy', async () => {
    const facade = setup({
      create: () => throwError(() => apiError(400, 'HOUSE_NAME_INVALID')),
    });
    await expect(facade.create({ name: '', note: null })).resolves.toBe(false);
    expect(facade.error()).toContain('назву або адресу');
    expect(facade.pending()).toBe(false);
  });

  it('update reloads the list after success', async () => {
    let lists = 0;
    const facade = setup({
      list: () => {
        lists += 1;
        return of([{ ...HOUSE, note: 'нова' }]);
      },
      update: () => of({ ...HOUSE, note: 'нова' }),
    });
    await expect(
      facade.update(1, { name: HOUSE.name, note: 'нова' }),
    ).resolves.toBe(true);
    expect(lists).toBe(1);
    expect(facade.houses()[0].note).toBe('нова');
  });

  it('remove failure surfaces the delete refusal copy (FR-HOUSE-02)', async () => {
    const facade = setup({
      remove: () => throwError(() => apiError(409, 'HOUSE_HAS_TICKETS')),
    });
    await expect(facade.remove(1)).resolves.toBe(false);
    expect(facade.error()).toContain('прив’язані заявки');
  });
});
