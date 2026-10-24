
import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: 'admin',
    children: [
      {
        path: '',
        loadComponent: () => import('../dashboard/components/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports').then((m) => m.Reports),
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/user-management/user-management').then((m) => m.UserManagement),
      },
    ]
  }
];