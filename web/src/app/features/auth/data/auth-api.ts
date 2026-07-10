import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SKIP_AUTH_REDIRECT } from '../../../core/auth-context';
import { UserDto } from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  requestOtp(phone: string): Observable<{ devCode?: string }> {
    return this.http.post<{ devCode?: string }>('/api/auth/otp/request', {
      phone,
    });
  }

  verifyOtp(phone: string, code: string): Observable<UserDto> {
    return this.http.post<UserDto>('/api/auth/otp/verify', { phone, code });
  }

  logout(): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>('/api/auth/logout', {});
  }

  // The silent session probe on bootstrap: a 401 here just means "guest",
  // the interceptor must not treat it as an expired session.
  me(): Observable<UserDto> {
    return this.http.get<UserDto>('/api/auth/me', {
      context: new HttpContext().set(SKIP_AUTH_REDIRECT, true),
    });
  }

  updateName(name: string | null): Observable<UserDto> {
    return this.http.patch<UserDto>('/api/auth/me', { name });
  }
}
