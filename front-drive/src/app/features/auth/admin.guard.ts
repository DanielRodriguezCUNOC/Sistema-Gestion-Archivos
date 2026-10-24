import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  if (user && user.role?.toLowerCase() === 'admin') {
    return true;
  }

  return router.createUrlTree(['/drive/my-drive']);
};