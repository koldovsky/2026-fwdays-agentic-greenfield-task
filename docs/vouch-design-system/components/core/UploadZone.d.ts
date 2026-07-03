/**
 * Drag-and-drop CV file upload zone.
 * Supports drag-hover state (blue), uploaded state (green), and click-to-browse.
 * FR-CV-01
 */
export interface UploadZoneProps {
  /** Primary label text */
  label?: string;
  /** Secondary hint below the label */
  hint?: string;
  /** Called with the File object when user drops or selects a file */
  onFile?: (file: File) => void;
}
