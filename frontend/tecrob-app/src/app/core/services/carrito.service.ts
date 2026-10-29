import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Producto } from './productos.service';

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  subtotal: number;
}

@Injectable({
  providedIn: 'root'
})
export class CarritoService {

  private carritoSubject = new BehaviorSubject<ItemCarrito[]>([]);
  public carrito$: Observable<ItemCarrito[]> = this.carritoSubject.asObservable();

  constructor() {
    const guardado = localStorage.getItem('tecrob_carrito');
    if (guardado) {
      this.carritoSubject.next(JSON.parse(guardado));
    }
  }

  private guardar(items: ItemCarrito[]): void {
    this.carritoSubject.next(items);
    localStorage.setItem('tecrob_carrito', JSON.stringify(items));
  }

  getItems(): ItemCarrito[] {
    return this.carritoSubject.value;
  }

  agregarProducto(producto: Producto, cantidad: number = 1): { success: boolean; mensaje?: string } {
    if (cantidad <= 0) {
      return { success: false, mensaje: 'La cantidad debe ser mayor a 0' };
    }

    if (producto.stock < cantidad) {
      return { success: false, mensaje: `Stock insuficiente. Disponible: ${producto.stock}` };
    }

    const items = [...this.carritoSubject.value];
    const index = items.findIndex(i => i.producto.id === producto.id);

    if (index >= 0) {
      const nuevaCantidad = items[index].cantidad + cantidad;

      if (producto.stock < nuevaCantidad) {
        return { success: false, mensaje: `Stock insuficiente. Disponible: ${producto.stock}` };
      }

      items[index] = {
        ...items[index],
        cantidad: nuevaCantidad,
        subtotal: nuevaCantidad * producto.precioVenta
      };
    } else {
      items.push({
        producto,
        cantidad,
        subtotal: cantidad * producto.precioVenta
      });
    }

    this.guardar(items);
    return { success: true };
  }

  actualizarCantidad(productoId: number, cantidad: number): void {
    if (cantidad <= 0) {
      this.eliminarProducto(productoId);
      return;
    }

    const items = this.carritoSubject.value.map(i => {
      if (i.producto.id === productoId) {
        return {
          ...i,
          cantidad,
          subtotal: cantidad * i.producto.precioVenta
        };
      }
      return i;
    });
    this.guardar(items);
  }

  eliminarProducto(productoId: number): void {
    const items = this.carritoSubject.value.filter(i => i.producto.id !== productoId);
    this.guardar(items);
  }

  vaciar(): void {
    this.guardar([]);
  }

  // El precio de venta YA INCLUYE IGV
  // Subtotal = Total / 1.18
  // IGV = Total - Subtotal

  getTotal(): number {
    // La suma de subtotales ya es el TOTAL con IGV incluido
    return this.carritoSubject.value.reduce((acc, item) => acc + item.subtotal, 0);
  }

  getSubtotal(): number {
    // Subtotal sin IGV = Total / 1.18
    return this.getTotal() / 1.18;
  }

  getIgv(): number {
    // IGV = Total - Subtotal
    return this.getTotal() - this.getSubtotal();
  }

  getTotalItems(): number {
    return this.carritoSubject.value.reduce((acc, item) => acc + item.cantidad, 0);
  }

}