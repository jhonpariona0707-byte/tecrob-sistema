import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CarritoService } from '../../core/services/carrito.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {

  totalCarrito: number = 0;
  get esAdmin(): boolean {
    return this.authService.getUsuario()?.rol === 'admin';
  }

  constructor(
    private authService: AuthService,
    private carritoService: CarritoService
  ) {}

  ngOnInit(): void {
    this.carritoService.carrito$.subscribe(() => {
      this.totalCarrito = this.carritoService.getTotalItems();
    });
  }

  cerrarSesion(): void {
    if (confirm('¿Cerrar sesión?')) {
      this.authService.logout();
    }
  }
}