import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileCard } from './profile-card';
import { UserDto } from '../data/auth.model';

const USER: UserDto = { id: 1, phone: '+380671234567', name: 'Василь' };

describe('ProfileCard', () => {
  let fixture: ComponentFixture<ProfileCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileCard],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileCard);
    fixture.componentRef.setInput('user', USER);
    await fixture.whenStable();
  });

  it('shows the phone and prefills the name', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('+380671234567');
    const input = el.querySelector<HTMLInputElement>('input');
    expect(input?.value).toBe('Василь');
  });

  it('emits the trimmed name on save and null for an empty name', async () => {
    const saved: Array<string | null> = [];
    fixture.componentInstance.nameSaved.subscribe((v) => saved.push(v));
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector<HTMLInputElement>('input');
    if (!input) throw new Error('name input not rendered');

    input.value = '  Марія  ';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    el.querySelector('form')?.dispatchEvent(new Event('submit'));

    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    el.querySelector('form')?.dispatchEvent(new Event('submit'));

    expect(saved).toEqual(['Марія', null]);
  });

  it('emits loggedOut when «Вийти» is clicked (FR-AUTH-04)', () => {
    let emitted = 0;
    fixture.componentInstance.loggedOut.subscribe(() => emitted++);
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    );
    const logout = buttons.find((b) => b.textContent?.includes('Вийти'));
    logout?.click();
    expect(emitted).toBe(1);
  });
});
