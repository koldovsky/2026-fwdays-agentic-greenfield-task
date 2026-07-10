import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HealthDto } from './health.model';

@Injectable({ providedIn: 'root' })
export class HealthApi {
  private readonly http = inject(HttpClient);

  check(): Observable<HealthDto> {
    return this.http.get<HealthDto>('/api/health');
  }
}
