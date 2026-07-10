import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketDto } from '../data/ticket.model';
import { TicketCard } from './ticket-card';

const TICKET: TicketDto = {
  id: 12,
  houseId: 7,
  houseName: 'Шевченка 12',
  title: 'Тече кран',
  description: null,
  category: 'PLUMBING',
  priority: 'NORMAL',
  status: 'IN_PROGRESS',
  allowedTransitions: ['DONE', 'REJECTED'],
  isOverdue: true,
  requesterName: null,
  requesterPhone: null,
  executor: null,
  dueDate: '2026-07-01',
  createdAt: '2026-07-08T00:00:00.000Z',
  updatedAt: '2026-07-08T00:00:00.000Z',
};

async function setup(ticket: TicketDto): Promise<ComponentFixture<TicketCard>> {
  await TestBed.configureTestingModule({
    imports: [TicketCard],
  }).compileComponents();
  const fixture = TestBed.createComponent(TicketCard);
  fixture.componentRef.setInput('ticket', ticket);
  await fixture.whenStable();
  return fixture;
}

describe('TicketCard', () => {
  it('highlights an overdue ticket on the card (FR-DUE-02)', async () => {
    const fixture = await setup(TICKET);
    const due: HTMLElement | null =
      fixture.nativeElement.querySelector('dd.overdue');
    expect(due?.textContent).toContain('01.07.2026');
    expect(due?.textContent).toContain('Прострочено');
  });

  it('shows no highlight when the server flag is off', async () => {
    const fixture = await setup({
      ...TICKET,
      isOverdue: false,
      status: 'CLOSED',
    });
    expect(fixture.nativeElement.querySelector('dd.overdue')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Прострочено');
  });
});
