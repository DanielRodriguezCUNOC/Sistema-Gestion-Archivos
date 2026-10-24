import { Routes } from '@angular/router';
import { MainLayout } from '../layout/main-layout/main-layout/main-layout.js';
import { authGuard } from './features/auth/auth.guard.js';
import { adminGuard } from './features/auth/admin.guard.js';

export const routes: Routes = [

  {
    path: '',
    loadComponent: () => import('./features/landing/landing.js').then(m => m.Landing),
    pathMatch: 'full'
  },

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
    canActivate: [authGuard],
    children: [
      {
        path: 'drive',
        loadChildren: () => import('./features/drive/drive.routes').then(m => m.DRIVE_ROUTES)
      },
      {
        path: 'dashboard',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
      }
    ]
  },

  //* Fallback para rutas inexistentes
  { path: '**', redirectTo: 'auth/login' }



];
