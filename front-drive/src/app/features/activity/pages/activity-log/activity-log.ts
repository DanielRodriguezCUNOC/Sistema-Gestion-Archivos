import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface ActivityUser {
  _id?: string;
  name?: string;
  email?: string;
}

interface ActivityLogItem {
  _id: string;
  action: string;
  resourceType: 'FILE' | 'FOLDER';
  resourceName: string;
  details?: Record<string, any>;
  createdAt: string;
  userId?: ActivityUser;
}

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './activity-log.html',
  styleUrl: './activity-log.css',
})
export class ActivityLog implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api';

  readonly logs = signal<ActivityLogItem[]>([]);
  readonly isLoading = signal(false);

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading.set(true);
    this.http.get<ActivityLogItem[]>(`${this.baseUrl}/activity-logs`).subscribe({
      next: (response) => {
        this.logs.set(response || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar historial de actividad', err);
        this.logs.set([]);
        this.isLoading.set(false);
      },
    });
  }

  toHumanMessage(log: ActivityLogItem): string {
    const actorName = log.userId?.name || 'Usuario';
    const resource = log.resourceName || 'recurso';

    switch (log.action) {
      case 'UPLOAD_FILE':
        return `${actorName} subio el archivo ${resource}`;
      case 'RENAME_FILE':
        return `${actorName} renombro el archivo ${resource}`;
      case 'RENAME_FOLDER':
        return `${actorName} renombro la carpeta ${resource}`;
      case 'MOVE_FILE':
        return `${actorName} movio el archivo ${resource}`;
      case 'UPDATE_FILE':
        return `${actorName} edito el archivo ${resource}`;
      case 'DELETE_FILE':
        return `${actorName} envio a papelera el archivo ${resource}`;
      case 'DELETE_FOLDER':
        return `${actorName} envio a papelera la carpeta ${resource}`;
      case 'RESTORE_FILE':
        return `${actorName} restauro el archivo ${resource}`;
      case 'RESTORE_FOLDER':
        return `${actorName} restauro la carpeta ${resource}`;
      case 'HARD_DELETE_FILE':
        return `${actorName} elimino definitivamente el archivo ${resource}`;
      case 'HARD_DELETE_FOLDER':
        return `${actorName} elimino definitivamente la carpeta ${resource}`;
      case 'SHARE_RESOURCE':
        return `${actorName} compartio ${log.resourceType === 'FILE' ? 'el archivo' : 'la carpeta'} ${resource}`;
      case 'REVOKE_SHARE':
        return `${actorName} revoco permisos sobre ${resource}`;
      case 'CREATE_FOLDER':
        return `${actorName} creo la carpeta ${resource}`;
      default:
        return `${actorName} realizo ${log.action} en ${resource}`;
    }
  }
}
