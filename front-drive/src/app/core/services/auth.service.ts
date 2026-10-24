import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, of, tap } from 'rxjs';
import { UserRole } from '../enums/user-role.enu';
import { AuthResponse } from '../models/auth-response.interface';
import { RegisterDto } from '../models/register.dto';
import { User } from '../models/user.interface';
import { LoginDto } from '../models/user.model';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiUrl;

  readonly currentUser = signal<User | null>(null);
  readonly isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);
  readonly isAuthenticated = computed(() => !!this.currentUser());

  private getUserFromStorage(): User | null {
    const userJson = localStorage.getItem('user');
    try {
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }

  login(dto: LoginDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, dto).pipe(
      tap((response) => {
        if (response.accessToken) {
          localStorage.setItem('access_token', response.accessToken);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.currentUser.set(response.user);
        }
      })
    );
  }

  logout(): void {
    const clearSession = () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      this.currentUser.set(null);
      this.router.navigate(['/auth/login']);
    };

    if (!localStorage.getItem('access_token')) {
      clearSession();
      return;
    }

    this.http
      .post(`${this.baseUrl}/auth/logout`, {})
      .pipe(
        catchError(() => of(null)),
        finalize(clearSession),
      )
      .subscribe();
  }

  registerPublic(dto: RegisterDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, dto).pipe(
      tap((response) => {
        if (response.accessToken) {
          localStorage.setItem('access_token', response.accessToken);
          this.currentUser.set(response.user);
        }
      })
    );
  }

  adminCreateUser(dto: RegisterDto): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, dto);
  }
}