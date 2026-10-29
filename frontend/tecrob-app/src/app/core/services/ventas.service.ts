import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ItemCarrito } from './carrito.service';

export interface DetalleVenta {
  productoId: number;
  codigo: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  numFactura: string;
  tipoComprobante: 'Boleta' | 'Factura';
  fecha: string;
  clienteId: number | null;
  clienteNombre: string;
  clienteDocumento: string;
  usuario: string;
  metodoPago: string;
  subtotal: number;
  igv: number;
  total: number;
  estado: 'Pagado' | 'Pendiente' | 'Anulado';
  items: DetalleVenta[];
}

interface VentaResult {
  success: boolean;
  venta?: Venta;
  mensaje?: string;
}

@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly ventasSubject = new BehaviorSubject<Venta[]>([]);
  readonly ventas$: Observable<Venta[]> = this.ventasSubject.asObservable();

  constructor(private api: ApiService) {
    this.cargarVentas();
  }

  getVentas(): Venta[] {
    return this.ventasSubject.value;
  }

  getVentaPorId(id: number): Venta | undefined {
    return this.ventasSubject.value.find(venta => venta.id === id);
  }

  registrarVenta(datos: {
    items: ItemCarrito[];
    clienteId: number | null;
    clienteNombre: string;
    clienteDocumento: string;
    usuario: string;
    usuarioId: number;
    metodoPago: string;
    subtotal: number;
    igv: number;
    total: number;
  }): Observable<VentaResult> {
    const request = {
      clienteId: datos.clienteId,
      usuarioId: datos.usuarioId,
      metodoPago: datos.metodoPago,
      items: datos.items.map(item => ({
        productoId: item.producto.id,
        cantidad: item.cantidad
      }))
    };

    return this.api.post<Venta>('/ventas', request).pipe(
      tap(venta => this.ventasSubject.next([venta, ...this.ventasSubject.value])),
      map(venta => ({ success: true, venta })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  filtrarVentas(fechaDesde: string, fechaHasta: string, estado: string): Venta[] {
    let result = this.ventasSubject.value;
    if (fechaDesde) result = result.filter(venta => venta.fecha.slice(0, 10) >= fechaDesde);
    if (fechaHasta) result = result.filter(venta => venta.fecha.slice(0, 10) <= fechaHasta);
    if (estado) result = result.filter(venta => venta.estado === estado);
    return result.sort((a, b) => b.id - a.id);
  }

  getTotalVentasDia(): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.ventasSubject.value
      .filter(venta => venta.fecha.slice(0, 10) === today && venta.estado === 'Pagado')
      .reduce((total, venta) => total + venta.total, 0);
  }

  private cargarVentas(): void {
    this.api.get<Venta[]>('/ventas').subscribe({
      next: sales => this.ventasSubject.next(sales),
      error: error => console.error(this.api.message(error))
    });
  }
}
