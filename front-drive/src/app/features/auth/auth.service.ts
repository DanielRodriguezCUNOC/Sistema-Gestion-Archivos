import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  logout(): void {

    this.http.post('/api/auth/logout', {}).subscribe({
      next: () => this.clearSessionAndRedirect(),
      error: () => this.clearSessionAndRedirect(),
    });
  }

  private clearSessionAndRedirect(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}