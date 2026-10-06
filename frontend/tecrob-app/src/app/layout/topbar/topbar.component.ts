import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, Usuario } from '../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit {

  usuario: Usuario | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.usuario$.subscribe(u => this.usuario = u);
  }

  get inicialUsuario(): string {
    return this.usuario?.nombre.charAt(0).toUpperCase() || 'U';
  }

  cerrarSesion(): void {
    if (confirm('¿Cerrar sesión?')) {
      this.authService.logout();
    }
  }
}