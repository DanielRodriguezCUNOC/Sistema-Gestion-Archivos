import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';
import { AdminActionCard, QuickStats } from '../../../models/admin.model';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterModule, FileSizePipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);

  stats = signal<QuickStats | null>(null);
  isLoadingStats = signal<boolean>(true);

  readonly actionCards: AdminActionCard[] = [
    {
      title: 'Reportes y Analíticas',
      description: 'Métricas de almacenamiento, tipos de archivos y volumen de operaciones por período.',
      icon: 'chart-bar',
      route: '/dashboard/admin/reports',
      badge: 'Métricas',
      color: 'indigo'
    },
    {
      title: 'Gestión de Usuarios',
      description: 'Administra roles, límites de almacenamiento y estado de las cuentas del sistema.',
      icon: 'users',
      route: '/dashboard/admin/users',
      color: 'sky'
    },
  ];

  ngOnInit(): void {
    this.loadQuickStats();
  }

  loadQuickStats(): void {
    this.isLoadingStats.set(true);
    this.adminService.getQuickStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.isLoadingStats.set(false);
      },
      error: (err) => {
        console.error('Error al cargar estadísticas rápidas de administración:', err);
        this.isLoadingStats.set(false);
      }
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
