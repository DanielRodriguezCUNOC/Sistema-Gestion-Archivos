import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface FileTypeReport {
  type: string;
  totalFiles: number;
  totalBytes: number;
  totalMB: number;
  mimeTypes: string[];
}

export interface TopUserFileReport {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  totalFiles: number;
  totalBytes: number;
  totalMB: number;
}

export interface TopActionReport {
  action: string;
  count: number;
  percentage: number;
}

export interface TopActionsResponse {
  period: { startDate: string; endDate: string };
  limitApplied: number;
  totalOperationsInPeriod: number;
  topActions: TopActionReport[];
}

export interface OperationsByPeriodResponse {
  groupingPeriod: 'DAILY' | 'MONTHLY' | 'YEARLY';
  dateRange: { startDate: string; endDate: string };
  totalOperations: number;
  summary: { period: string; count: number }[];
}

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

  getTopUsersByFileCount(limit: number = 10): Observable<TopUserFileReport[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<TopUserFileReport[]>(`${this.baseUrl}/top-users-files`, { params });
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
}