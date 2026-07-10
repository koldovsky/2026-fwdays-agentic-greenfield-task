import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface AttachmentViewData {
  url: string;
  fileName: string;
}

// Full-size photo view (FR-ATTACH-02): the same API URL as the thumbnail —
// the original file, just not CSS-scaled down.
@Component({
  selector: 'app-attachment-view-dialog',
  imports: [MatButtonModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title class="title">{{ data.fileName }}</h2>
    <mat-dialog-content>
      <img class="image" [src]="data.url" [alt]="data.fileName" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close>Закрити</button>
    </mat-dialog-actions>
  `,
  styles: `
    .title {
      overflow-wrap: anywhere;
    }

    .image {
      display: block;
      max-width: 100%;
      max-height: 70vh;
      margin: 0 auto;
    }
  `,
})
export class AttachmentViewDialog {
  protected readonly data = inject<AttachmentViewData>(MAT_DIALOG_DATA);
}
