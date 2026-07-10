import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TicketListItemDto } from '../data/ticket.model';
import { TicketList } from './ticket-list';

const ROW: TicketListItemDto = {
  id: 12,
  title: 'Тече кран',
  houseName: 'Шевченка 12',
  category: 'PLUMBING',
  priority: 'NORMAL',
  status: 'IN_PROGRESS',
  dueDate: '2026-07-01',
  isOverdue: true,
  createdAt: '2026-07-08T00:00:00.000Z',
};

const CLOSED_ROW: TicketListItemDto = {
  ...ROW,
  id: 13,
  status: 'CLOSED',
  isOverdue: false,
};

async function setup(
  items: TicketListItemDto[],
  hasMore = false,
): Promise<ComponentFixture<TicketList>> {
  await TestBed.configureTestingModule({
    imports: [TicketList],
    providers: [provideRouter([])],
  }).compileComponents();
  const fixture = TestBed.createComponent(TicketList);
  fixture.componentRef.setInput('items', items);
  fixture.componentRef.setInput('hasMore', hasMore);
  fixture.componentRef.setInput('loadingMore', false);
  await fixture.whenStable();
  return fixture;
}

describe('TicketList', () => {
  it('renders the FR-LIST-01 columns and links the row to the card', async () => {
    const fixture = await setup([ROW]);
    const row: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('a.row');
    expect(row?.getAttribute('href')).toBe('/tickets/12');
    for (const piece of [
      '#12',
      'Тече кран',
      'Шевченка 12',
      'Сантехніка',
      'Звичайна',
      'В роботі',
      '08.07.2026',
      '01.07.2026',
    ]) {
      expect(row?.textContent).toContain(piece);
    }
  });

  it('highlights the overdue row and not its closed twin (FR-DUE-02)', async () => {
    const fixture = await setup([ROW, CLOSED_ROW]);
    const rows = fixture.nativeElement.querySelectorAll('a.row');
    expect(rows[0].classList.contains('overdue')).toBe(true);
    expect(rows[0].textContent).toContain('прострочено');
    expect(rows[1].classList.contains('overdue')).toBe(false);
    expect(rows[1].textContent).not.toContain('прострочено');
  });

  it('shows the Ukrainian empty state instead of a blank list', async () => {
    const fixture = await setup([]);
    expect(fixture.nativeElement.textContent).toContain('Нічого не знайдено');
    expect(fixture.nativeElement.querySelector('ul')).toBeNull();
  });

  it('«Показати ще» emits and disappears on the last page (FR-LIST-04)', async () => {
    const fixture = await setup([ROW], true);
    const emitted = vi.fn();
    fixture.componentInstance.more.subscribe(emitted);
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('button.more');
    expect(button.textContent).toContain('Показати ще');
    button.click();
    expect(emitted).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('hasMore', false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button.more')).toBeNull();
  });
});
