import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UserOption } from '../../../shared/utils/user-option.interface';
import { FileTypeReport, FileByDateReport, TopActiveFileReport, TopUserFileReport, TopSharedUserReport, TopSharedFileReport, SharedResourcesReport, UserActivityReport, ReceivedResourcesReport, OperationsSummaryReport, TopActionsResponse, OperationsByPeriodResponse } from '../../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reports`;

  getFilesGroupedByType(userId?: string): Observable<FileTypeReport[]> {
    let params = new HttpParams();
    if (userId) params = params.set('userId', userId);
    return this.http.get<FileTypeReport[]>(`${this.baseUrl}/files-by-type`, { params });
  }

  getFilesByDateRange(startDate: string, endDate: string, userId?: string): Observable<FileByDateReport> {
    let params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    if (userId) params = params.set('userId', userId);
    return this.http.get<FileByDateReport>(`${this.baseUrl}/files-by-date`, { params });
  }

  getTopActiveFiles(limit: number = 10, userId?: string): Observable<TopActiveFileReport[]> {
    let params = new HttpParams().set('limit', limit);
    if (userId) params = params.set('userId', userId);
    return this.http.get<TopActiveFileReport[]>(`${this.baseUrl}/top-active-files`, { params });
  }

  getTopUsersByFileCount(limit: number = 10): Observable<TopUserFileReport[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<TopUserFileReport[]>(`${this.baseUrl}/top-users-files`, { params });
  }

  getTopUsersBySharedResources(limit: number = 10): Observable<TopSharedUserReport[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<TopSharedUserReport[]>(`${this.baseUrl}/top-shared-users`, { params });
  }

  getTopSharedFiles(limit: number = 10, userId?: string): Observable<TopSharedFileReport[]> {
    let params = new HttpParams().set('limit', limit);
    if (userId) params = params.set('userId', userId);
    return this.http.get<TopSharedFileReport[]>(`${this.baseUrl}/top-shared-files`, { params });
  }

  getSharedResourcesByUser(userId: string): Observable<SharedResourcesReport> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<SharedResourcesReport>(`${this.baseUrl}/user-shared-resources`, { params });
  }

  getUserActivityByDateRange(userId: string, startDate: string, endDate: string): Observable<UserActivityReport> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<UserActivityReport>(`${this.baseUrl}/user-activity`, { params });
  }

  getReceivedResourcesByUser(userId: string): Observable<ReceivedResourcesReport> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<ReceivedResourcesReport>(`${this.baseUrl}/user-received-resources`, { params });
  }

  getOperationsSummary(startDate?: string, endDate?: string): Observable<OperationsSummaryReport> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<OperationsSummaryReport>(`${this.baseUrl}/operations-summary`, { params });
  }

  getTopActions(limit: number = 5, startDate?: string, endDate?: string): Observable<TopActionsResponse> {
    let params = new HttpParams().set('limit', limit);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<TopActionsResponse>(`${this.baseUrl}/top-actions`, { params });
  }

  getOperationsByPeriod(period: 'DAILY' | 'MONTHLY' | 'YEARLY' = 'DAILY', startDate?: string, endDate?: string): Observable<OperationsByPeriodResponse> {
    let params = new HttpParams().set('period', period);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<OperationsByPeriodResponse>(`${this.baseUrl}/operations-by-period`, { params });
  }

  searchUsers(query: string): Observable<UserOption[]> {
    const params = new HttpParams().set('q', query.trim());
    return this.http.get<UserOption[]>(`${environment.apiUrl}/users/admin/search`, { params });
  }
}