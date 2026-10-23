// dashboard.routes.ts
import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: 'user',
    loadComponent: () => import('./pages/user-metrics/user-metrics').then((m) => m.UserMetrics),
  },
  {
    path: 'admin',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/admin-metrics/admin-metrics').then((m) => m.AdminMetrics),
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports').then((m) => m.Reports),
      },
    ]
  },
  {
    path: '',
    redirectTo: 'user',
    pathMatch: 'full',
  },
];