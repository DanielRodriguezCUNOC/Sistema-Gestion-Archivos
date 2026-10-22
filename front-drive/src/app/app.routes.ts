import { Routes } from '@angular/router';
import { MainLayout } from '../layout/main-layout/main-layout/main-layout.js';

export const routes: Routes = [

  //* Rutas publicas
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/pages/login/login.js').then(m => m.Login)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/components/register-form/register-form.js').then(m => m.RegisterForm)
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ]
  },

  //* Rutas privadas
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: 'drive',
        loadChildren: () => import('./features/drive/drive.routes').then(m => m.DRIVE_ROUTES)
      },
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
      },
      { path: '', redirectTo: 'drive/my-drive', pathMatch: 'full' }
    ]
  },

  // Fallback para rutas inexistentes
  { path: '**', redirectTo: 'auth/login' }



];
