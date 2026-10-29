import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RepuestosService, Repuesto } from '../../core/services/repuestos.service';
import { AuthService } from '../../core/services/auth.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

@Component({
  selector: 'app-repuestos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './repuestos.component.html',
  styleUrl: './repuestos.component.scss'
})
export class RepuestosComponent implements OnInit {

  repuestos: Repuesto[] = [];
  repuestosFiltrados: Repuesto[] = [];
  categorias: string[] = [];

  buscar: string = '';
  categoriaFiltro: string = '';
  pagina = 1;
  filasPorPagina = 10;

  mostrarModal: boolean = false;
  modoEdicion: boolean = false;

  repuestoForm: Omit<Repuesto, 'id' | 'fechaRegistro'> = this.nuevoRepuesto();

  mensaje: { tipo: 'success' | 'error'; texto: string } | null = null;

  constructor(
    private repuestosService: RepuestosService,
    private authService: AuthService
  ) {}

  get esAdmin(): boolean {
    return this.authService.getUsuario()?.rol === 'admin';
  }

  ngOnInit(): void {
    this.categorias = this.repuestosService.categorias;
    this.repuestosService.repuestos$.subscribe(repuestos => {
      this.repuestos = repuestos;
      this.filtrar();
    });
  }

  nuevoRepuesto(): Omit<Repuesto, 'id' | 'fechaRegistro'> {
    return {
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: 'Discos Duros',
      precioCompra: 0,
      precioVenta: 0,
      stock: 0,
      stockMinimo: 3,
      proveedor: '',
      ubicacion: ''
    };
  }

  filtrar(): void {
    this.repuestosFiltrados = this.repuestosService.buscarRepuestos(this.buscar, this.categoriaFiltro);
    this.pagina = 1;
  }

  abrirModalNuevo(): void {
    this.repuestoForm = this.nuevoRepuesto();
    this.modoEdicion = false;
    this.mostrarModal = true;
    this.mensaje = null;
  }

  abrirModalEditar(repuesto: Repuesto): void {
    this.repuestoForm = {
      codigo: repuesto.codigo,
      nombre: repuesto.nombre,
      descripcion: repuesto.descripcion,
      categoria: repuesto.categoria,
      precioCompra: repuesto.precioCompra,
      precioVenta: repuesto.precioVenta,
      stock: repuesto.stock,
      stockMinimo: repuesto.stockMinimo,
      proveedor: repuesto.proveedor,
      ubicacion: repuesto.ubicacion
    };
    (this.repuestoForm as any).id = repuesto.id;
    this.modoEdicion = true;
    this.mostrarModal = true;
    this.mensaje = null;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.repuestoForm = this.nuevoRepuesto();
    this.modoEdicion = false;
    this.mensaje = null;
  }

  guardar(): void {
    const form = this.repuestoForm;
    if (!form.codigo.trim() || !form.nombre.trim() || !form.categoria.trim()) {
      this.mensaje = { tipo: 'error', texto: 'Complete código, nombre y categoría' };
      return;
    }
    if (![form.precioCompra, form.precioVenta].every(value => Number.isFinite(value) && value >= 0)) {
      this.mensaje = { tipo: 'error', texto: 'Los precios deben ser números no negativos' };
      return;
    }
    if (![form.stock, form.stockMinimo].every(value => Number.isInteger(value) && value >= 0)) {
      this.mensaje = { tipo: 'error', texto: 'El stock y el mínimo deben ser enteros no negativos' };
      return;
    }

    if (this.modoEdicion) {
      const id = (this.repuestoForm as any).id;
      this.repuestosService.actualizarRepuesto(id, this.repuestoForm).subscribe(resultado => {
        this.procesarGuardado(resultado.success, resultado.mensaje);
      });
    } else {
      this.repuestosService.crearRepuesto(this.repuestoForm).subscribe(resultado => {
        this.procesarGuardado(resultado.success, resultado.mensaje);
      });
    }
  }

  private procesarGuardado(success: boolean, mensaje?: string): void {
    if (success) {
      this.mensaje = {
        tipo: 'success',
        texto: this.modoEdicion ? '✅ Repuesto actualizado' : '✅ Repuesto registrado'
      };
      setTimeout(() => this.cerrarModal(), 800);
    } else {
      this.mensaje = { tipo: 'error', texto: mensaje || 'Error' };
    }
  }

  eliminar(repuesto: Repuesto): void {
    if (confirm(`¿Eliminar el repuesto ${repuesto.nombre}?`)) {
      this.repuestosService.eliminarRepuesto(repuesto.id).subscribe(resultado => {
        this.mensaje = resultado.success
          ? { tipo: 'success', texto: '✅ Repuesto eliminado' }
          : { tipo: 'error', texto: resultado.mensaje || 'Error al eliminar' };
        setTimeout(() => this.mensaje = null, 3000);
      });
    }
  }

  stockBajo(r: Repuesto): boolean {
    return r.stock <= r.stockMinimo && r.stock > 0;
  }

  sinStock(r: Repuesto): boolean {
    return r.stock === 0;
  }
}