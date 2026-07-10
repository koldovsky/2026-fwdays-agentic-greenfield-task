import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketStatus } from '../data/ticket.model';
import { TicketActions } from './ticket-actions';

async function setup(
  status: TicketStatus,
  allowedTransitions: TicketStatus[],
): Promise<ComponentFixture<TicketActions>> {
  await TestBed.configureTestingModule({
    imports: [TicketActions],
  }).compileComponents();
  const fixture = TestBed.createComponent(TicketActions);
  fixture.componentRef.setInput('status', status);
  fixture.componentRef.setInput('allowedTransitions', allowedTransitions);
  await fixture.whenStable();
  return fixture;
}

function buttonEls(
  fixture: ComponentFixture<TicketActions>,
): HTMLButtonElement[] {
  const host: HTMLElement = fixture.nativeElement;
  return Array.from(host.querySelectorAll<HTMLButtonElement>('button'));
}

function buttons(fixture: ComponentFixture<TicketActions>): string[] {
  return buttonEls(fixture).map((b) => b.textContent?.trim() ?? '');
}

describe('TicketActions', () => {
  it('renders one button per allowed transition with the §5.1 action label', async () => {
    const fixture = await setup('NEW', ['IN_PROGRESS', 'REJECTED']);
    expect(buttons(fixture)).toEqual(['Взято в роботу', 'Не виконуємо']);
  });

  it('labels the same target by the source status (reopen vs take)', async () => {
    const fixture = await setup('DONE', ['IN_PROGRESS', 'CLOSED']);
    expect(buttons(fixture)).toEqual([
      'Повторне відкриття',
      'Підтверджено й закрито',
    ]);
  });

  it('renders nothing for a terminal status (empty list from the API)', async () => {
    const fixture = await setup('CLOSED', []);
    expect(buttons(fixture)).toEqual([]);
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('emits the target status on click and disables while pending', async () => {
    const fixture = await setup('NEW', ['IN_PROGRESS', 'REJECTED']);
    const emitted: TicketStatus[] = [];
    fixture.componentInstance.transition.subscribe((to) => emitted.push(to));

    buttonEls(fixture)[0]?.click();
    expect(emitted).toEqual(['IN_PROGRESS']);

    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(buttonEls(fixture).map((b) => b.disabled)).toEqual([true, true]);
  });
});
