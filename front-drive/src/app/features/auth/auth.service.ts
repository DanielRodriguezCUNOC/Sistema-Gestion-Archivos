import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserRole } from '../../core/enums/user-role.enu';
import { User } from '../../core/models/user.interface';
import { RegisterDto } from '../../core/models/register.dto';
import { Observable, tap } from 'rxjs';
import { AuthResponse } from '../../core/models/auth-response.interface';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  //private readonly baseUrl = 'http://localhost:3000/api';
  private readonly baseUrl = environment.apiUrl;
  readonly currentUser = signal<User | null>(null);
  readonly isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);

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