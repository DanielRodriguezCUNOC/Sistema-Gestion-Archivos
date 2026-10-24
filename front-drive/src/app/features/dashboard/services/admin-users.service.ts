import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AdminUser,
  AdminUserListQuery,
  AdminUserListResponse,
  CreateAdminUserDto,
} from '../../models/admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  list(query: AdminUserListQuery): Observable<AdminUserListResponse> {
    let params = new HttpParams()
      .set('status', query.status)
      .set('page', query.page)
      .set('limit', query.limit);

    const search = query.search.trim();
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<AdminUserListResponse>(`${this.baseUrl}/admin`, { params });
  }

  create(dto: CreateAdminUserDto): Observable<AdminUser> {
    return this.http.post<AdminUser>(this.baseUrl, dto);
  }

  updateStatus(id: string, isActive: boolean): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.baseUrl}/admin/${id}/status`, { isActive });
  }
}
