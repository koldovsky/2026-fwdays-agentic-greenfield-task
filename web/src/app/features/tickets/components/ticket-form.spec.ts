import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HouseDto } from '../../houses/data/house.model';
import { TicketDto, TicketInput } from '../data/ticket.model';
import { TicketForm } from './ticket-form';

const HOUSE: HouseDto = {
  id: 7,
  name: 'Шевченка 12',
  note: null,
  createdAt: '2026-07-08T00:00:00.000Z',
  updatedAt: '2026-07-08T00:00:00.000Z',
};

const TICKET: TicketDto = {
  id: 12,
  houseId: 7,
  houseName: 'Шевченка 12',
  title: 'Тече кран',
  description: 'На кухні',
  category: 'PLUMBING',
  priority: 'HIGH',
  status: 'NEW',
  allowedTransitions: ['IN_PROGRESS', 'REJECTED'],
  isOverdue: false,
  requesterName: 'Іван',
  requesterPhone: '+380671112233',
  executor: null,
  dueDate: '2026-07-20',
  createdAt: '2026-07-08T00:00:00.000Z',
  updatedAt: '2026-07-08T00:00:00.000Z',
};

async function setup(
  ticket: TicketDto | null,
): Promise<ComponentFixture<TicketForm>> {
  await TestBed.configureTestingModule({
    imports: [TicketForm],
  }).compileComponents();
  const fixture = TestBed.createComponent(TicketForm);
  fixture.componentRef.setInput('houses', [HOUSE]);
  fixture.componentRef.setInput('ticket', ticket);
  await fixture.whenStable();
  return fixture;
}

function input(
  fixture: ComponentFixture<TicketForm>,
  label: string,
): HTMLInputElement | HTMLTextAreaElement {
  const el: HTMLElement = fixture.nativeElement;
  const field = Array.from(el.querySelectorAll('mat-form-field')).find((f) =>
    f.querySelector('mat-label')?.textContent?.includes(label),
  );
  const control = field?.querySelector<HTMLInputElement>('input, textarea');
  if (!control) throw new Error(`no input for label ${label}`);
  return control;
}

describe('TicketForm', () => {
  it('blocks submit without required fields and shows Ukrainian errors', async () => {
    const fixture = await setup(null);
    const saved: TicketInput[] = [];
    fixture.componentInstance.saved.subscribe((v) => saved.push(v));

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(saved).toEqual([]);
    expect(el.textContent).toContain('Вкажіть назву заявки');
    expect(el.textContent).toContain('Оберіть будинок');
    expect(el.textContent).toContain('Оберіть категорію');
  });

  it('a whitespace-only title stays invalid (required does not trim)', async () => {
    const fixture = await setup(TICKET);
    const saved: TicketInput[] = [];
    fixture.componentInstance.saved.subscribe((v) => saved.push(v));

    const title = input(fixture, 'Назва');
    title.value = '   ';
    title.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('form')
      ?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(saved).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Вкажіть назву заявки');
  });

  it('prefills from the ticket input and emits a trimmed, null-normalized payload', async () => {
    const fixture = await setup(TICKET);
    const saved: TicketInput[] = [];
    fixture.componentInstance.saved.subscribe((v) => saved.push(v));

    // prefill (edit mode)
    expect(input(fixture, 'Назва').value).toBe('Тече кран');
    expect(input(fixture, 'ПІБ заявника').value).toBe('Іван');

    // edit two fields, spaces included; empty requester name becomes null
    const title = input(fixture, 'Назва');
    title.value = '  Нова назва  ';
    title.dispatchEvent(new Event('input'));
    const executor = input(fixture, 'Виконавець');
    executor.value = '  Майстер Петро  ';
    executor.dispatchEvent(new Event('input'));
    const requester = input(fixture, 'ПІБ заявника');
    requester.value = '   ';
    requester.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('form')
      ?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(saved).toEqual([
      {
        title: 'Нова назва',
        houseId: 7,
        category: 'PLUMBING',
        priority: 'HIGH',
        dueDate: '2026-07-20', // prefilled date round-trips unchanged
        executor: 'Майстер Петро',
        requesterName: null,
        requesterPhone: '+380671112233',
        description: 'На кухні',
      },
    ]);
  });

  it('emits cancelled from the cancel button', async () => {
    const fixture = await setup(null);
    let cancelled = 0;
    fixture.componentInstance.cancelled.subscribe(() => cancelled++);
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    );
    buttons.find((b) => b.textContent?.includes('Скасувати'))?.click();
    expect(cancelled).toBe(1);
  });
});
