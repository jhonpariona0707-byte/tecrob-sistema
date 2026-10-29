import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router,RouterLink } from '@angular/router';
import { CarritoService, ItemCarrito } from '../../core/services/carrito.service';
import { ProductosService } from '../../core/services/productos.service';
import { ClientesService, Cliente } from '../../core/services/clientes.service';
import { VentasService } from '../../core/services/ventas.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, FormsModule,RouterLink],
  templateUrl: './carrito.component.html',
  styleUrl: './carrito.component.scss'
})
export class CarritoComponent implements OnInit {

  items: ItemCarrito[] = [];
  clientes: Cliente[] = [];
  clienteSeleccionado: number | null = null;
  metodoPago: string = 'Efectivo';

  subtotal: number = 0;
  igv: number = 0;
  total: number = 0;
  totalItems: number = 0;

  mensaje: { tipo: 'success' | 'error'; texto: string } | null = null;

  metodosPago = ['Efectivo', 'Tarjeta Débito', 'Tarjeta Crédito', 'Transferencia', 'Yape/Plin', 'Otro'];

  constructor(
    private carritoService: CarritoService,
    private productosService: ProductosService,
    private clientesService: ClientesService,
    private ventasService: VentasService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carritoService.carrito$.subscribe(items => {
      this.items = items;
      this.calcularTotales();
    });

    this.clientesService.clientes$.subscribe(clientes => {
      this.clientes = clientes;
    });
  }

  calcularTotales(): void {
    this.subtotal = this.carritoService.getSubtotal();
    this.igv = this.carritoService.getIgv();
    this.total = this.carritoService.getTotal();
    this.totalItems = this.carritoService.getTotalItems();
  }

  cambiarCantidad(item: ItemCarrito, nuevaCantidad: number): void {
    if (nuevaCantidad <= 0) {
      this.eliminar(item);
      return;
    }

    if (nuevaCantidad > item.producto.stock) {
      this.mensaje = {
        tipo: 'error',
        texto: `Stock insuficiente. Disponible: ${item.producto.stock}`
      };
      setTimeout(() => this.mensaje = null, 3000);
      return;
    }

    this.carritoService.actualizarCantidad(item.producto.id, nuevaCantidad);
  }

  eliminar(item: ItemCarrito): void {
    if (confirm(`¿Eliminar ${item.producto.nombre} del carrito?`)) {
      this.carritoService.eliminarProducto(item.producto.id);
    }
  }

  vaciar(): void {
    if (confirm('¿Vaciar todo el carrito?')) {
      this.carritoService.vaciar();
      this.mensaje = { tipo: 'success', texto: '🗑️ Carrito vaciado' };
      setTimeout(() => this.mensaje = null, 2500);
    }
  }

    finalizarVenta(): void {
    if (this.items.length === 0) {
      this.mensaje = { tipo: 'error', texto: 'El carrito está vacío' };
      return;
    }

    if (!confirm(`¿Finalizar la venta por un total de S/ ${this.total.toFixed(2)}?`)) {
      return;
    }

    // Obtener datos del cliente
    let clienteNombre = 'Cliente general';
    let clienteDocumento = '-';

    if (this.clienteSeleccionado) {
      const cliente = this.clientesService.getClientePorId(this.clienteSeleccionado);
      if (cliente) {
        clienteNombre = `${cliente.nombre} ${cliente.apellidos}`;
        clienteDocumento = cliente.numDocumento;
      }
    }

    // Obtener usuario logueado
    const usuario = this.authService.getUsuario();
    if (!usuario) {
      this.mensaje = { tipo: 'error', texto: 'Inicie sesión nuevamente antes de registrar la venta.' };
      return;
    }

    this.ventasService.registrarVenta({
      items: this.items,
      clienteId: this.clienteSeleccionado,
      clienteNombre,
      clienteDocumento,
      usuario: usuario.nombre,
      usuarioId: usuario.id,
      metodoPago: this.metodoPago,
      subtotal: this.subtotal,
      igv: this.igv,
      total: this.total
    }).subscribe(resultado => {
      if (!resultado.success || !resultado.venta) {
        this.mensaje = { tipo: 'error', texto: resultado.mensaje || 'No se pudo registrar la venta.' };
        return;
      }

      this.productosService.recargar();
      this.carritoService.vaciar();
      this.mensaje = {
        tipo: 'success',
        texto: `✅ Venta ${resultado.venta.numFactura} registrada por S/ ${resultado.venta.total.toFixed(2)}`
      };

      setTimeout(() => this.router.navigate(['/admin/ventas']), 1500);
    });
  }
}