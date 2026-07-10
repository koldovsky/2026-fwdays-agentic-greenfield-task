export interface HealthDto {
  status: 'ok' | 'error';
  db: 'up' | 'down';
}
