import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';
import { UserPicker } from '../../../../shared/components/user-picker/user-picker';
import { UserOption } from '../../../../shared/utils/user-option.interface';
import { ReportsService } from '../../services/reports.service';
import { FileTypeReport, TopActiveFileReport, FileByDateReport, TopUserFileReport, TopSharedUserReport, TopSharedFileReport, SharedResourcesReport, ReceivedResourcesReport, UserActivityReport, OperationsSummaryReport, TopActionReport, OperationsByPeriodResponse } from '../../../models/report.model';

type TabId = 'storage' | 'users' | 'sharing' | 'activity';
type Period = 'DAILY' | 'MONTHLY' | 'YEARLY';

@Component({
  selector: 'app-reports',
  imports: [CommonModule, FormsModule, FileSizePipe, UserPicker],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit {
  private readonly reportsService = inject(ReportsService);

  activeTab = signal<TabId>('storage');
  isLoading = signal<boolean>(false);

  //*  Almacenamiento 
  filesByType = signal<FileTypeReport[]>([]);
  topActiveFiles = signal<TopActiveFileReport[]>([]);

  filesByDateResult = signal<FileByDateReport | null>(null);
  startDate = signal<string>(this.defaultStartDate());
  endDate = signal<string>(this.today());
  dateError = signal<string>('');
  isSearchingFiles = signal<boolean>(false);

  //*  Usuarios 
  topUsersByFiles = signal<TopUserFileReport[]>([]);
  topUsersByShared = signal<TopSharedUserReport[]>([]);

  //*  Compartición 
  topSharedFiles = signal<TopSharedFileReport[]>([]);

  sharedByUser = signal<UserOption | null>(null);
  sharedByUserResult = signal<SharedResourcesReport | null>(null);
  isSearchingShared = signal<boolean>(false);

  receivedByUser = signal<UserOption | null>(null);
  receivedByUserResult = signal<ReceivedResourcesReport | null>(null);
  isSearchingReceived = signal<boolean>(false);

  //*  Actividad 
  activityUser = signal<UserOption | null>(null);
  activityResult = signal<UserActivityReport | null>(null);
  activityStart = signal<string>(this.defaultStartDate());
  activityEnd = signal<string>(this.today());
  activityError = signal<string>('');
  isSearchingActivity = signal<boolean>(false);

  operationsSummary = signal<OperationsSummaryReport | null>(null);
  topActions = signal<TopActionReport[]>([]);
  operationsTimeline = signal<OperationsByPeriodResponse | null>(null);
  period = signal<Period>('DAILY');

  ngOnInit(): void {
    this.loadStorageTab();
  }

  setTab(tab: TabId): void {
    this.activeTab.set(tab);
    if (tab === 'storage') this.loadStorageTab();
    else if (tab === 'users') this.loadUsersTab();
    else if (tab === 'sharing') this.loadSharingTab();
    else if (tab === 'activity') this.loadActivityTab();
  }

  //*  Storage 

  loadStorageTab(): void {
    this.isLoading.set(true);
    this.reportsService.getFilesGroupedByType().subscribe({
      next: (data) => { this.filesByType.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
    this.reportsService.getTopActiveFiles().subscribe({
      next: (data) => this.topActiveFiles.set(data),
      error: () => { },
    });
  }

  searchFilesByDate(): void {
    this.dateError.set(this.validateRange(this.startDate(), this.endDate()));
    if (this.dateError()) return;

    this.isSearchingFiles.set(true);
    this.reportsService.getFilesByDateRange(this.startDate(), this.endDate()).subscribe({
      next: (data) => { this.filesByDateResult.set(data); this.isSearchingFiles.set(false); },
      error: () => this.isSearchingFiles.set(false),
    });
  }

  //*  Users 

  loadUsersTab(): void {
    this.isLoading.set(true);
    this.reportsService.getTopUsersByFileCount().subscribe({
      next: (data) => { this.topUsersByFiles.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
    this.reportsService.getTopUsersBySharedResources().subscribe({
      next: (data) => this.topUsersByShared.set(data),
      error: () => { },
    });
  }

  //*  Sharing 

  loadSharingTab(): void {
    this.isLoading.set(true);
    this.reportsService.getTopSharedFiles().subscribe({
      next: (data) => { this.topSharedFiles.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  onSharedByUserChange(user: UserOption | null): void {
    this.sharedByUser.set(user);
    this.sharedByUserResult.set(null);
  }

  onReceivedByUserChange(user: UserOption | null): void {
    this.receivedByUser.set(user);
    this.receivedByUserResult.set(null);
  }

  onActivityUserChange(user: UserOption | null): void {
    this.activityUser.set(user);
    this.activityResult.set(null);
  }

  searchSharedByUser(): void {
    const user = this.sharedByUser();
    if (!user) return;
    this.isSearchingShared.set(true);
    this.reportsService.getSharedResourcesByUser(user.id).subscribe({
      next: (data) => { this.sharedByUserResult.set(data); this.isSearchingShared.set(false); },
      error: () => this.isSearchingShared.set(false),
    });
  }

  searchReceivedByUser(): void {
    const user = this.receivedByUser();
    if (!user) return;
    this.isSearchingReceived.set(true);
    this.reportsService.getReceivedResourcesByUser(user.id).subscribe({
      next: (data) => { this.receivedByUserResult.set(data); this.isSearchingReceived.set(false); },
      error: () => this.isSearchingReceived.set(false),
    });
  }

  //*  Activity 

  loadActivityTab(): void {
    this.isLoading.set(true);
    this.reportsService.getOperationsSummary().subscribe({
      next: (data) => { this.operationsSummary.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
    this.reportsService.getTopActions().subscribe({
      next: (res) => this.topActions.set(res.topActions),
      error: () => { },
    });
    this.reportsService.getOperationsByPeriod(this.period()).subscribe({
      next: (res) => this.operationsTimeline.set(res),
      error: () => { },
    });
  }

  searchUserActivity(): void {
    const user = this.activityUser();
    if (!user) return;

    this.activityError.set(this.validateRange(this.activityStart(), this.activityEnd()));
    if (this.activityError()) return;

    this.isSearchingActivity.set(true);
    this.reportsService
      .getUserActivityByDateRange(user.id, this.activityStart(), this.activityEnd())
      .subscribe({
        next: (data) => { this.activityResult.set(data); this.isSearchingActivity.set(false); },
        error: () => this.isSearchingActivity.set(false),
      });
  }

  onPeriodChange(newPeriod: Period): void {
    this.period.set(newPeriod);
    this.reportsService.getOperationsByPeriod(newPeriod).subscribe({
      next: (res) => this.operationsTimeline.set(res),
      error: () => { },
    });
  }

  //*  Helpers 

  formatActionName(action: string): string {
    const map: Record<string, string> = {
      UPLOAD_FILE: 'Subir Archivo',
      DELETE_FILE: 'Eliminar Archivo',
      RESTORE_FILE: 'Restaurar Archivo',
      HARD_DELETE_FILE: 'Borrado Permanente (Archivo)',
      CREATE_FOLDER: 'Crear Carpeta',
      DELETE_FOLDER: 'Eliminar Carpeta',
      RESTORE_FOLDER: 'Restaurar Carpeta',
      HARD_DELETE_FOLDER: 'Borrado Permanente (Carpeta)',
      SHARE_RESOURCE: 'Compartir Recurso',
      REVOKE_SHARE: 'Revocar Compartición',
      UPDATE_FILE: 'Actualizar Archivo',
      RENAME_FILE: 'Renombrar Archivo',
      MOVE_FILE: 'Mover Archivo',
      CREATE_USER: 'Crear Usuario',
      ACTIVATE_USER: 'Activar Usuario',
      DEACTIVATE_USER: 'Desactivar Usuario',
      REGISTER_USER: 'Registro de Usuario',
      LOGIN: 'Inicio de Sesión',
      LOGIN_FAILED: 'Inicio de Sesión Fallido',
      LOGOUT: 'Cierre de Sesión',
      VIEW_FILE: 'Ver Archivo',
      DOWNLOAD_FILE: 'Descargar Archivo',
    };
    return map[action] || action;
  }

  private validateRange(start: string, end: string): string {
    if (!start || !end) return 'Selecciona ambas fechas.';
    if (start > end) return 'La fecha "Desde" no puede ser posterior a "Hasta".';
    return '';
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private defaultStartDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  }
}