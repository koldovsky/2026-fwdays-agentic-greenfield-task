import { ComponentFixture, TestBed } from '@angular/core/testing';
import { eventText } from '../data/ticket-labels';
import { FeedItemDto } from '../data/ticket.model';
import { TicketFeed } from './ticket-feed';

const NOTE: FeedItemDto = {
  id: 1,
  type: 'NOTE',
  authorId: 1,
  authorName: 'Іван',
  text: 'Дзвонив майстру',
  field: null,
  oldValue: null,
  newValue: null,
  createdAt: '2026-07-08T10:00:00.000Z',
};

const EVENT: FeedItemDto = {
  ...NOTE,
  id: 2,
  type: 'EVENT',
  text: null,
  field: 'STATUS',
  oldValue: 'NEW',
  newValue: 'IN_PROGRESS',
};

async function setup(
  items: FeedItemDto[],
): Promise<ComponentFixture<TicketFeed>> {
  await TestBed.configureTestingModule({
    imports: [TicketFeed],
  }).compileComponents();
  const fixture = TestBed.createComponent(TicketFeed);
  fixture.componentRef.setInput('items', items);
  await fixture.whenStable();
  return fixture;
}

describe('TicketFeed', () => {
  it('renders notes and events visually distinct in one list (FR-FEED-02)', async () => {
    const fixture = await setup([NOTE, EVENT]);
    const host: HTMLElement = fixture.nativeElement;
    const note = host.querySelector('li.note');
    const event = host.querySelector('li.event');
    expect(note?.textContent).toContain('Дзвонив майстру');
    expect(event?.textContent).toContain('Статус: Нова → В роботі');
    // both kinds carry the author and the date-time (FR-FEED-01)
    expect(note?.textContent).toContain('Іван');
    expect(event?.textContent).toContain('Іван');
    expect(note?.textContent).toContain('08.07.2026');
  });

  it('renders attachment events as Ukrainian sentences (S-07, FR-FEED-02)', async () => {
    const added: FeedItemDto = {
      ...EVENT,
      id: 3,
      field: 'ATTACHMENT',
      oldValue: null,
      newValue: 'кухня.jpg',
    };
    const removed: FeedItemDto = {
      ...EVENT,
      id: 4,
      field: 'ATTACHMENT',
      oldValue: 'кухня.jpg',
      newValue: null,
    };
    const fixture = await setup([added, removed]);
    const events = fixture.nativeElement.querySelectorAll('li.event');
    expect(events[0]?.textContent).toContain('Додано фото «кухня.jpg»');
    expect(events[1]?.textContent).toContain('Видалено фото «кухня.jpg»');
  });

  it('shows the empty hint when the feed has no items yet', async () => {
    const fixture = await setup([]);
    expect(fixture.nativeElement.textContent).toContain('Записів ще немає');
    expect(fixture.nativeElement.querySelector('ol')).toBeNull();
  });
});

// Event sentences are composed from locale-free wire snapshots
// (field/oldValue/newValue) in exactly one place — ticket-labels.ts.
describe('eventText', () => {
  it('maps enum snapshots through the Ukrainian label tables', () => {
    expect(eventText(EVENT)).toBe('Статус: Нова → В роботі');
    expect(
      eventText({
        ...EVENT,
        field: 'CATEGORY',
        oldValue: 'PLUMBING',
        newValue: 'ELEVATOR',
      }),
    ).toBe('Категорія: Сантехніка → Ліфт');
    expect(
      eventText({
        ...EVENT,
        field: 'PRIORITY',
        oldValue: 'NORMAL',
        newValue: 'EMERGENCY',
      }),
    ).toBe('Пріоритет: Звичайна → Аварійна');
  });

  it('renders due dates as dd.MM.yyyy and empty values as a dash (FR-DUE-01)', () => {
    expect(
      eventText({
        ...EVENT,
        field: 'DUE_DATE',
        oldValue: null,
        newValue: '2026-07-20',
      }),
    ).toBe('Цільовий термін: — → 20.07.2026');
    expect(
      eventText({
        ...EVENT,
        field: 'DUE_DATE',
        oldValue: '2026-07-20',
        newValue: null,
      }),
    ).toBe('Цільовий термін: 20.07.2026 → —');
  });

  it('passes house and executor snapshots through as-is', () => {
    expect(
      eventText({
        ...EVENT,
        field: 'HOUSE',
        oldValue: 'Шевченка 12',
        newValue: 'Франка 3',
      }),
    ).toBe('Будинок: Шевченка 12 → Франка 3');
    expect(
      eventText({
        ...EVENT,
        field: 'EXECUTOR',
        oldValue: null,
        newValue: 'Майстер Петро',
      }),
    ).toBe('Виконавець: — → Майстер Петро');
  });
});
