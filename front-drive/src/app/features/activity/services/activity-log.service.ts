import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ActivityLogItem } from '../../models/activity-log.model';

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/activity-logs`;

  getLogs(): Observable<ActivityLogItem[]> {
    return this.http.get<ActivityLogItem[]>(this.baseUrl);
  }
}