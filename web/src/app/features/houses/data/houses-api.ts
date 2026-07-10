import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HouseDto, HouseInput } from './house.model';

@Injectable({ providedIn: 'root' })
export class HousesApi {
  private readonly http = inject(HttpClient);

  list(): Observable<HouseDto[]> {
    return this.http.get<HouseDto[]>('/api/houses');
  }

  create(input: HouseInput): Observable<HouseDto> {
    return this.http.post<HouseDto>('/api/houses', input);
  }

  update(id: number, input: HouseInput): Observable<HouseDto> {
    return this.http.patch<HouseDto>(`/api/houses/${id}`, input);
  }

  remove(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/houses/${id}`);
  }
}
