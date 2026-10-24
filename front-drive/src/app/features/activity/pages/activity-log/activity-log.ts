import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivityLogItem } from '../../../models/activity-log.model';
import { ActivityLogService } from '../../services/activity-log.service';
import { ActivityMessagePipe } from '../../pipes/activity-message.pipe';

@Component({
  selector: 'app-activity-log',
  imports: [DatePipe, ActivityMessagePipe],
  templateUrl: './activity-log.html',
  styleUrl: './activity-log.css',
})
export class ActivityLog implements OnInit {
  private readonly activityLogService = inject(ActivityLogService);

  readonly logs = signal<ActivityLogItem[]>([]);
  readonly isLoading = signal(false);

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading.set(true);
    this.activityLogService.getLogs().subscribe({
      next: (response) => {
        this.logs.set(response ?? []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar historial de actividad', err);
        this.logs.set([]);
        this.isLoading.set(false);
      },
    });
  }
}