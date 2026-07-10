/**
 * Job processing status pill for the Vouch tailoring pipeline.
 * FR-TAILOR-01: queued → processing → done (or failed).
 */
export interface StatusPillProps {
  /** Current pipeline status */
  status?: 'queued' | 'processing' | 'done' | 'failed';
}
