import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { PublicLayoutComponent } from './public/layout/public-layout/public-layout.component';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // ===== RUTAS PÚBLICAS =====
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./public/home/home.component')
          .then(m => m.HomeComponent)
      },
      {
        path: 'productos',
        loadComponent: () => import('./public/catalogo/catalogo.component')
          .then(m => m.CatalogoComponent)
      },
      {
        path: 'consulta',
        loadComponent: () => import('./public/consulta/consulta.component')
          .then(m => m.ConsultaComponent)
      }
    ]
  },

  // ===== LOGIN =====
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent)
  },

  // ===== RUTAS ADMIN (protegidas) =====
  {
    path: 'admin',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'clientes',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('./features/clientes/clientes.component')
          .then(m => m.ClientesComponent)
      },
      {
        path: 'equipos',
        loadComponent: () => import('./features/equipos/equipos.component')
          .then(m => m.EquiposComponent)
      },
      {
        path: 'ordenes',
        loadComponent: () => import('./features/ordenes/ordenes.component')
          .then(m => m.OrdenesComponent)
      },
      {
        path: 'seguimiento',
        loadComponent: () => import('./features/ordenes/seguimiento/seguimiento.component')
          .then(m => m.SeguimientoComponent)
      },
      {
        path: 'repuestos',
        loadComponent: () => import('./features/repuestos/repuestos.component')
          .then(m => m.RepuestosComponent)
      },
      {
        path: 'productos',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('./features/productos/productos.component')
          .then(m => m.ProductosComponent)
      },
      {
        path: 'carrito',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('./features/carrito/carrito.component')
          .then(m => m.CarritoComponent)
      },
      {
        path: 'ventas',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('./features/ventas/ventas.component')
          .then(m => m.VentasComponent)
      },
      {
        path: 'ticket/:numOrden',
        loadComponent: () => import('./features/ordenes/ticket/ticket.component')
          .then(m => m.TicketComponent)
      }
    ]
  },

  // ===== RUTAS NO ENCONTRADAS =====
  {
    path: '**',
    redirectTo: ''
  }
];