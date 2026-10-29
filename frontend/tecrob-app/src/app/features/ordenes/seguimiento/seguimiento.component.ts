import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Orden, OrdenesService } from '../../../core/services/ordenes.service';

@Component({
  selector: 'app-seguimiento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './seguimiento.component.html'
})
export class SeguimientoComponent implements OnInit {
  readonly estados: Orden['estado'][] = [
    'Pendiente',
    'En reparación',
    'Esperando repuesto',
    'Reparado',
    'Entregado',
    'No reparable'
  ];

  ordenes: Orden[] = [];
  numeroSeleccionado = '';
  nuevoEstado: Orden['estado'] = 'Pendiente';
  comentario = '';
  cargando = true;
  guardando = false;
  error = '';
  mensaje = '';

  constructor(
    private readonly ordenesService: OrdenesService
  ) {}

  get ordenSeleccionada(): Orden | undefined {
    return this.ordenes.find(order => order.numOrden === this.numeroSeleccionado);
  }

  ngOnInit(): void {
    this.ordenesService.ordenes$.subscribe(orders => {
      this.ordenes = orders;
      if (!this.numeroSeleccionado && orders.length > 0) {
        this.seleccionarOrden(orders[0].numOrden);
      }
    });
    this.ordenesService.cargar().subscribe({
      next: () => this.cargando = false,
      error: () => {
        this.error = 'No se pudieron cargar las órdenes. Revisa la conexión con la API.';
        this.cargando = false;
      }
    });
  }

  seleccionarOrden(numero: string): void {
    this.numeroSeleccionado = numero;
    const order = this.ordenSeleccionada;
    this.nuevoEstado = order?.estado ?? 'Pendiente';
    this.comentario = '';
    this.mensaje = '';
    this.error = '';
  }

  guardarEstado(): void {
    const order = this.ordenSeleccionada;
    if (!order || this.nuevoEstado === order.estado) {
      this.error = 'Selecciona un estado diferente al actual.';
      return;
    }
    if (this.comentario.length > 1000) {
      this.error = 'El comentario no puede superar 1000 caracteres.';
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mensaje = '';
    this.ordenesService.cambiarEstado(order.numOrden, this.nuevoEstado, this.comentario.trim())
      .subscribe(updated => {
        this.guardando = false;
        if (!updated) {
          this.error = 'No se pudo actualizar el estado. Revisa el aviso de conexión e inténtalo nuevamente.';
          return;
        }
        this.mensaje = `Estado de la orden ${updated.numOrden} actualizado correctamente.`;
        this.comentario = '';
      });
  }
}
