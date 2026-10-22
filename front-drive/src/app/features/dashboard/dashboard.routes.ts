import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: 'user',
    loadComponent: () =>
      import('./pages/user-metrics/user-metrics.js').then(
        (m) => m.UserMetrics
      ),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin-metrics/admin-metrics.js').then(
        (m) => m.AdminMetrics
      ),
  },
  {
    path: '',
    redirectTo: 'user',
    pathMatch: 'full',
  },
];