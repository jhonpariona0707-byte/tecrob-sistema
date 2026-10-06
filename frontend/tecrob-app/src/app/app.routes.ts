import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'clientes',
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
        path: 'repuestos',
        loadComponent: () => import('./features/repuestos/repuestos.component')
          .then(m => m.RepuestosComponent)
      },
      {
        path: 'productos',
        loadComponent: () => import('./features/productos/productos.component')
          .then(m => m.ProductosComponent)
      },
      {
        path: 'carrito',
        loadComponent: () => import('./features/carrito/carrito.component')
          .then(m => m.CarritoComponent)
      },
      {
        path: 'ventas',
        loadComponent: () => import('./features/ventas/ventas.component')
          .then(m => m.VentasComponent)
      },

            {
        path: 'ticket/:numOrden',
        loadComponent: () => import('./features/ordenes/ticket/ticket.component')
          .then(m => m.TicketComponent)
      }
    ]
  }
];