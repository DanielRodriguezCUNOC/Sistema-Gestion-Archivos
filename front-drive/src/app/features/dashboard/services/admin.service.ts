import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { QuickStats } from '../../models/admin.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin`;

  getQuickStats(): Observable<QuickStats> {
    return this.http.get<QuickStats>(`${this.baseUrl}/stats`);
  }
}