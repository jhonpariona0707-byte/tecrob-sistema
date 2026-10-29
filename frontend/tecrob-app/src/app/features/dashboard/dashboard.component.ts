import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface DashboardData {
  estadisticas: {
    clientes: number;
    ordenesPendientes: number;
    ordenesReparadas: number;
  };
  stockBajo: {
    tipo: 'Producto' | 'Repuesto';
    id: number;
    codigo: string;
    nombre: string;
    stock: number;
    stockMinimo: number;
  }[];
  ultimasOrdenes: {
    numOrden: string;
    estado: string;
    fechaIngreso: string;
    cliente: string;
    equipo: string;
  }[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  datos: DashboardData | null = null;
  cargando = true;
  error = '';

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService
  ) {}

  get esAdmin(): boolean {
    return this.auth.getUsuario()?.rol === 'admin';
  }

  ngOnInit(): void {
    this.api.get<DashboardData>('/dashboard').subscribe({
      next: data => {
        this.datos = data;
        this.cargando = false;
      },
      error: error => {
        this.error = this.api.message(error);
        this.cargando = false;
      }
    });
  }
}
