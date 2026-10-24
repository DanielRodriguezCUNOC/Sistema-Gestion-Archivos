import { Routes } from '@angular/router';

export const DRIVE_ROUTES: Routes = [
  {
    path: 'my-drive',
    loadComponent: () =>
      import('./pages/my-drive/my-drive.js').then((m) => m.MyDrive),
  },
  {
    path: 'shared',
    loadComponent: () =>
      import('./pages/shared/shared.js').then((m) => m.Shared),
  },
  {
    path: 'trash',
    loadComponent: () =>
      import('./pages/trash/trash.js').then((m) => m.Trash),
  },
  {
    path: 'activity-log',
    loadComponent: () =>
      import('../../features/activity/pages/activity-log/activity-log.js').then((m) => m.ActivityLog),
  },
];