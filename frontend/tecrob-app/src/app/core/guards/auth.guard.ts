import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.sesionLista$.pipe(
    filter(ready => ready),
    take(1),
    map(() => authService.isLoggedIn() ? true : router.createUrlTree(['/login']))
  );
};

export const roleGuard: CanActivateFn = route => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as string[] | undefined;

  return authService.sesionLista$.pipe(
    filter(ready => ready),
    take(1),
    map(() => {
      if (!authService.isLoggedIn()) {
        return router.createUrlTree(['/login']);
      }

      return allowedRoles?.includes(authService.getUsuario()?.rol ?? '')
        ? true
        : router.createUrlTree(['/admin/dashboard']);
    })
  );
};