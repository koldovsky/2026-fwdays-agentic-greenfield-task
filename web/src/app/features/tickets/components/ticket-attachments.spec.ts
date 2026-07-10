import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttachmentDto } from '../data/ticket.model';
import { TicketAttachments } from './ticket-attachments';

const PHOTO: AttachmentDto = {
  id: 3,
  fileName: 'кухня.jpg',
  mimeType: 'image/jpeg',
  size: 3_000_000,
  createdAt: '2026-07-09T10:00:00.000Z',
};

async function setup(
  attachments: AttachmentDto[],
  pending = false,
): Promise<ComponentFixture<TicketAttachments>> {
  await TestBed.configureTestingModule({
    imports: [TicketAttachments],
  }).compileComponents();
  const fixture = TestBed.createComponent(TicketAttachments);
  fixture.componentRef.setInput('attachments', attachments);
  fixture.componentRef.setInput('ticketId', 12);
  fixture.componentRef.setInput('pending', pending);
  await fixture.whenStable();
  return fixture;
}

describe('TicketAttachments', () => {
  it('renders thumbnails pointing at the API binary URL (FR-ATTACH-02/03)', async () => {
    const fixture = await setup([PHOTO]);
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/api/tickets/12/attachments/3');
    expect(img.alt).toBe('кухня.jpg');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('shows the empty hint without a grid', async () => {
    const fixture = await setup([]);
    expect(fixture.nativeElement.textContent).toContain('Фото ще немає');
    expect(fixture.nativeElement.querySelector('ul')).toBeNull();
  });

  it('emits view and remove for a photo', async () => {
    const fixture = await setup([PHOTO]);
    const viewed: AttachmentDto[] = [];
    const removed: AttachmentDto[] = [];
    fixture.componentInstance.view.subscribe((a) => viewed.push(a));
    fixture.componentInstance.remove.subscribe((a) => removed.push(a));
    (
      fixture.nativeElement.querySelector('.thumb') as HTMLButtonElement
    ).click();
    (
      fixture.nativeElement.querySelector('.delete') as HTMLButtonElement
    ).click();
    expect(viewed).toEqual([PHOTO]);
    expect(removed).toEqual([PHOTO]);
  });

  it('emits picked files and clears the input so a re-pick fires again', async () => {
    const fixture = await setup([]);
    const picked: File[][] = [];
    fixture.componentInstance.filesPicked.subscribe((f) => picked.push(f));
    const input = fixture.nativeElement.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
    const file = new File(['x'], 'кухня.jpg', { type: 'image/jpeg' });
    // this DOM impl has no DataTransfer — stub the read-only files list
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    expect(picked).toEqual([[file]]);
    expect(input.value).toBe('');
  });

  it('disables the upload button at the 10-photo limit (FR-ATTACH-01)', async () => {
    const full = Array.from({ length: 10 }, (_, i) => ({
      ...PHOTO,
      id: i + 1,
    }));
    const fixture = await setup(full);
    const button = fixture.nativeElement.querySelector(
      'button[matButton="tonal"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('disables the upload button while an upload is pending', async () => {
    const fixture = await setup([PHOTO], true);
    const button = fixture.nativeElement.querySelector(
      'button[matButton="tonal"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
