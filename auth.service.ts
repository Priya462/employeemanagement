import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from './api.config';

interface LoginResponse {
  token: string;
  expiresInSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly token = signal(localStorage.getItem('token'));
  readonly role = signal(this.readRole(localStorage.getItem('token') ?? '') || this.normalizeRole(localStorage.getItem('role')));

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, { username, password }).pipe(
      tap((response) => {
        const role = this.readRole(response.token) || username.trim().toUpperCase();
        localStorage.setItem('token', response.token);
        localStorage.setItem('role', role);
        this.token.set(response.token);
        this.role.set(role);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.token.set(null);
    this.role.set('');
  }

  private readRole(token: string): string {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
      const role = payload['role'] ?? payload['roles'] ?? payload['authorities'];
      return this.normalizeRole(Array.isArray(role) ? String(role[0]) : String(role ?? ''));
    } catch {
      return '';
    }
  }

  private normalizeRole(role: string | null): string {
    return (role ?? '').replace(/^ROLE_/i, '').trim().toUpperCase();
  }
}
