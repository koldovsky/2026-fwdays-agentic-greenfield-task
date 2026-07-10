import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HouseDto } from '../../houses/data/house.model';
import {
  DEFAULT_TICKET_LIST_FILTERS,
  TicketListFilters,
} from '../data/ticket.model';
import { TicketFilters } from './ticket-filters';

const HOUSE: HouseDto = {
  id: 7,
  name: 'Шевченка 12',
  note: null,
  createdAt: '2026-07-08T00:00:00.000Z',
  updatedAt: '2026-07-08T00:00:00.000Z',
};

async function setup(
  filters: TicketListFilters = DEFAULT_TICKET_LIST_FILTERS,
): Promise<{
  fixture: ComponentFixture<TicketFilters>;
  emitted: TicketListFilters[];
}> {
  await TestBed.configureTestingModule({
    imports: [TicketFilters],
  }).compileComponents();
  const fixture = TestBed.createComponent(TicketFilters);
  fixture.componentRef.setInput('filters', filters);
  fixture.componentRef.setInput('houses', [HOUSE]);
  const emitted: TicketListFilters[] = [];
  fixture.componentInstance.changed.subscribe((f) => emitted.push(f));
  await fixture.whenStable();
  return { fixture, emitted };
}

function chipByLabel(
  fixture: ComponentFixture<TicketFilters>,
  label: string,
): HTMLElement {
  const chips: NodeListOf<HTMLElement> =
    fixture.nativeElement.querySelectorAll('mat-chip-option');
  const chip = Array.from(chips).find((c) =>
    c.textContent?.includes(label),
  ) as HTMLElement;
  // the selectable surface is the inner action button
  return chip.querySelector('.mdc-evolution-chip__action') ?? chip;
}

describe('TicketFilters', () => {
  it('offers the «активні» preset and every status as chips (FR-LIST-02)', async () => {
    const { fixture } = await setup();
    const text = fixture.nativeElement.textContent;
    for (const label of [
      'Активні',
      'Нова',
      'В роботі',
      'Виконана',
      'Закрита',
      'Відхилена',
    ]) {
      expect(text).toContain(label);
    }
  });

  it('selecting the «активні» chip emits the ACTIVE status filter', async () => {
    const { fixture, emitted } = await setup();
    chipByLabel(fixture, 'Активні').click();
    await fixture.whenStable();
    expect(emitted).toEqual([
      { ...DEFAULT_TICKET_LIST_FILTERS, status: 'ACTIVE' },
    ]);
  });

  it('deselecting the current status chip emits «всі статуси»', async () => {
    const { fixture, emitted } = await setup({
      ...DEFAULT_TICKET_LIST_FILTERS,
      status: 'ACTIVE',
    });
    chipByLabel(fixture, 'Активні').click();
    await fixture.whenStable();
    expect(emitted).toEqual([{ ...DEFAULT_TICKET_LIST_FILTERS, status: null }]);
  });

  it('search emits once, trimmed, after the 300 ms pause (FR-LIST-03)', async () => {
    const { fixture, emitted } = await setup();
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[type="search"]',
    );
    vi.useFakeTimers();
    try {
      for (const value of ['Іва', 'Іван', ' Іваненко ']) {
        input.value = value;
        input.dispatchEvent(new Event('input'));
        vi.advanceTimersByTime(100);
      }
      vi.advanceTimersByTime(300);
    } finally {
      vi.useRealTimers();
    }
    expect(emitted).toEqual([
      { ...DEFAULT_TICKET_LIST_FILTERS, q: 'Іваненко' },
    ]);
  });
});
