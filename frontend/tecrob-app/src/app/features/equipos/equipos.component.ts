import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EquiposService, Equipo } from '../../core/services/equipos.service';
import { ClientesService, Cliente } from '../../core/services/clientes.service';
import { AuthService } from '../../core/services/auth.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

@Component({
  selector: 'app-equipos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './equipos.component.html',
  styleUrl: './equipos.component.scss'
})
export class EquiposComponent implements OnInit {

  equipos: Equipo[] = [];
  equiposFiltrados: Equipo[] = [];
  clientes: Cliente[] = [];
  tiposEquipo: string[] = [];

  buscar: string = '';
  clienteFiltro: number | null = null;
  pagina = 1;
  filasPorPagina = 10;

  mostrarModal: boolean = false;
  modoEdicion: boolean = false;

  equipoForm: Omit<Equipo, 'id' | 'fechaRegistro'> = this.nuevoEquipo();

  mensaje: { tipo: 'success' | 'error'; texto: string } | null = null;

  constructor(
    private equiposService: EquiposService,
    private clientesService: ClientesService,
    private authService: AuthService
  ) {}

  get esAdmin(): boolean {
    return this.authService.getUsuario()?.rol === 'admin';
  }

  ngOnInit(): void {
    this.tiposEquipo = this.equiposService.tiposEquipo;

    this.equiposService.equipos$.subscribe(equipos => {
      this.equipos = equipos;
      this.filtrar();
    });

    this.clientesService.clientes$.subscribe(clientes => {
      this.clientes = clientes;
    });
  }

  nuevoEquipo(): Omit<Equipo, 'id' | 'fechaRegistro'> {
    return {
      clienteId: 0,
      clienteNombre: '',
      clienteDocumento: '',
      tipo: 'Laptop',
      marca: '',
      modelo: '',
      serie: '',
      caracteristicas: '',
      contrasena: '',
      accesorios: ''
    };
  }

  filtrar(): void {
    this.equiposFiltrados = this.equiposService.buscarEquipos(this.buscar, this.clienteFiltro);
    this.pagina = 1;
  }

  onClienteChange(clienteId: number): void {
    const cliente = this.clientesService.getClientePorId(clienteId);
    if (cliente) {
      this.equipoForm.clienteNombre = `${cliente.nombre} ${cliente.apellidos}`;
      this.equipoForm.clienteDocumento = cliente.numDocumento;
    }
  }

  abrirModalNuevo(): void {
    this.equipoForm = this.nuevoEquipo();
    this.modoEdicion = false;
    this.mostrarModal = true;
    this.mensaje = null;
  }

  abrirModalEditar(equipo: Equipo): void {
    this.equipoForm = {
      clienteId: equipo.clienteId,
      clienteNombre: equipo.clienteNombre,
      clienteDocumento: equipo.clienteDocumento,
      tipo: equipo.tipo,
      marca: equipo.marca,
      modelo: equipo.modelo,
      serie: equipo.serie,
      caracteristicas: equipo.caracteristicas,
      contrasena: equipo.contrasena,
      accesorios: equipo.accesorios
    };
    (this.equipoForm as any).id = equipo.id;
    this.modoEdicion = true;
    this.mostrarModal = true;
    this.mensaje = null;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.equipoForm = this.nuevoEquipo();
    this.modoEdicion = false;
    this.mensaje = null;
  }

  guardar(): void {
    if (!this.equipoForm.clienteId) {
      this.mensaje = { tipo: 'error', texto: 'Seleccione un cliente' };
      return;
    }
    if (!this.equipoForm.marca || !this.equipoForm.modelo) {
      this.mensaje = { tipo: 'error', texto: 'Complete marca y modelo' };
      return;
    }

    if (this.modoEdicion) {
      const id = (this.equipoForm as any).id;
      this.equiposService.actualizarEquipo(id, this.equipoForm).subscribe(resultado => {
        this.procesarGuardado(resultado.success, resultado.mensaje);
      });
    } else {
      this.equiposService.crearEquipo(this.equipoForm).subscribe(resultado => {
        this.procesarGuardado(resultado.success, resultado.mensaje);
      });
    }
  }

  private procesarGuardado(success: boolean, mensaje?: string): void {
    if (success) {
      this.mensaje = {
        tipo: 'success',
        texto: this.modoEdicion ? '✅ Equipo actualizado' : '✅ Equipo registrado'
      };
      setTimeout(() => this.cerrarModal(), 800);
    } else {
      this.mensaje = { tipo: 'error', texto: mensaje || 'Error' };
    }
  }

  eliminar(equipo: Equipo): void {
    if (confirm(`¿Eliminar el equipo ${equipo.marca} ${equipo.modelo}?`)) {
      this.equiposService.eliminarEquipo(equipo.id).subscribe(resultado => {
        if (resultado.success) {
          this.mensaje = { tipo: 'success', texto: '✅ Equipo eliminado' };
          setTimeout(() => this.mensaje = null, 3000);
        } else {
          this.mensaje = { tipo: 'error', texto: resultado.mensaje || 'Error' };
          setTimeout(() => this.mensaje = null, 4000);
        }
      });
    }
  }

  contarOrdenes(equipo: Equipo): number {
    return this.equiposService.contarOrdenesPorEquipo(equipo.serie);
  }
}