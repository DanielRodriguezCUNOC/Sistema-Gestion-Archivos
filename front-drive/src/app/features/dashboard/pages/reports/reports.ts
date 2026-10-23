import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';
import { ReportsService, FileTypeReport, TopUserFileReport, TopActionReport, OperationsByPeriodResponse } from '../../services/reports.service';

@Component({
  selector: 'app-reports',
  imports: [CommonModule, FormsModule, FileSizePipe],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit {

  private readonly reportsService = inject(ReportsService);

  activeTab = signal<'types' | 'users' | 'actions' | 'timeline'>('types');
  isLoading = signal<boolean>(false);

  // Datos
  filesByType = signal<FileTypeReport[]>([]);
  topUsers = signal<TopUserFileReport[]>([]);
  topActions = signal<TopActionReport[]>([]);
  operationsTimeline = signal<OperationsByPeriodResponse | null>(null);

  period = signal<'DAILY' | 'MONTHLY' | 'YEARLY'>('DAILY');

  ngOnInit(): void {
    this.loadActiveTab();
  }

  setTab(tab: 'types' | 'users' | 'actions' | 'timeline'): void {
    this.activeTab.set(tab);
    this.loadActiveTab();
  }

  loadActiveTab(): void {
    this.isLoading.set(true);
    const tab = this.activeTab();

    if (tab === 'types') {
      this.reportsService.getFilesGroupedByType().subscribe({
        next: (data) => { this.filesByType.set(data); this.isLoading.set(false); },
        error: () => this.isLoading.set(false)
      });
    } else if (tab === 'users') {
      this.reportsService.getTopUsersByFileCount().subscribe({
        next: (data) => { this.topUsers.set(data); this.isLoading.set(false); },
        error: () => this.isLoading.set(false)
      });
    } else if (tab === 'actions') {
      this.reportsService.getTopActions().subscribe({
        next: (res) => { this.topActions.set(res.topActions); this.isLoading.set(false); },
        error: () => this.isLoading.set(false)
      });
    } else if (tab === 'timeline') {
      this.reportsService.getOperationsByPeriod(this.period()).subscribe({
        next: (res) => { this.operationsTimeline.set(res); this.isLoading.set(false); },
        error: () => this.isLoading.set(false)
      });
    }
  }

  onPeriodChange(newPeriod: 'DAILY' | 'MONTHLY' | 'YEARLY'): void {
    this.period.set(newPeriod);
    if (this.activeTab() === 'timeline') {
      this.loadActiveTab();
    }
  }

  formatActionName(action: string): string {
    const map: Record<string, string> = {
      UPLOAD_FILE: 'Subir Archivo',
      DELETE_FILE: 'Eliminar Archivo',
      RESTORE_FILE: 'Restaurar Archivo',
      HARD_DELETE_FILE: 'Borrado Permanente Archivo',
      CREATE_FOLDER: 'Crear Carpeta',
      DELETE_FOLDER: 'Eliminar Carpeta',
      RESTORE_FOLDER: 'Restaurar Carpeta',
      HARD_DELETE_FOLDER: 'Borrado Permanente Carpeta',
      SHARE_RESOURCE: 'Compartir Recurso',
      REVOKE_SHARE: 'Revocar Compartición',
      UPDATE_FILE: 'Actualizar Archivo',
      RENAME_FILE: 'Renombrar Archivo',
      MOVE_FILE: 'Mover Archivo'
    };
    return map[action] || action;
  }
}
