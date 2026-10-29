import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductosService, Producto } from '../../core/services/productos.service';
import { CarritoService } from '../../core/services/carrito.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { ApiService } from '../../core/services/api.service';
import { downloadCsv, localDateStamp } from '../../core/utils/csv-export';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.scss'
})
export class ProductosComponent implements OnInit {

  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  categorias: string[] = [];

  buscar: string = '';
  categoriaFiltro: string = '';
  pagina = 1;
  filasPorPagina = 10;

  mostrarModal: boolean = false;
  modoEdicion: boolean = false;
  productoEdicionId: number | null = null;

  productoForm: Omit<Producto, 'id' | 'fechaRegistro'> = this.nuevoProducto();
  imagenSeleccionada: File | null = null;
  vistaPreviaImagen: string | null = null;

  mensaje: { tipo: 'success' | 'error'; texto: string } | null = null;

  // Para el carrito
  cantidades: { [key: number]: number } = {};

  constructor(
    private productosService: ProductosService,
    private carritoService: CarritoService,
    readonly api: ApiService
  ) {}

  ngOnInit(): void {
    this.categorias = this.productosService.categorias;
    this.productosService.recargar();
    this.productosService.productos$.subscribe(productos => {
      this.productos = productos;
      this.filtrar();
      // Inicializar cantidades
      productos.forEach(p => {
        if (!this.cantidades[p.id]) this.cantidades[p.id] = 1;
      });
    });
  }

  nuevoProducto(): Omit<Producto, 'id' | 'fechaRegistro'> {
    return {
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: 'Periféricos',
      precioCompra: 0,
      precioVenta: 0,
      stock: 0,
      stockMinimo: 5,
      proveedor: '',
      imagen: null
    };
  }

  filtrar(): void {
    this.productosFiltrados = this.productosService.buscarProductos(this.buscar, this.categoriaFiltro);
    this.pagina = 1;
  }

  exportarInventario(): void {
    const rows = this.productosFiltrados.map(producto => [
      producto.codigo,
      producto.nombre,
      producto.categoria,
      producto.proveedor,
      producto.precioCompra.toFixed(2),
      producto.precioVenta.toFixed(2),
      producto.stock,
      producto.stockMinimo,
      producto.stock === 0 ? 'Agotado' : producto.stock <= producto.stockMinimo ? 'Stock bajo' : 'Disponible',
      (producto.precioCompra * producto.stock).toFixed(2),
      (producto.precioVenta * producto.stock).toFixed(2),
      producto.fechaRegistro
    ]);

    downloadCsv(
      `reporte-inventario-${localDateStamp()}.csv`,
      [
        'Código', 'Producto', 'Categoría', 'Proveedor', 'Costo unitario', 'Precio de venta',
        'Stock actual', 'Stock mínimo', 'Estado', 'Valor al costo', 'Valor de venta del stock',
        'Fecha de registro'
      ],
      rows
    );
  }

  abrirModalNuevo(): void {
    this.productoForm = this.nuevoProducto();
    this.limpiarVistaPrevia();
    this.modoEdicion = false;
    this.productoEdicionId = null;
    this.mostrarModal = true;
    this.mensaje = null;
  }

  abrirModalEditar(producto: Producto): void {
    this.productoForm = {
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      categoria: producto.categoria,
      precioCompra: producto.precioCompra,
      precioVenta: producto.precioVenta,
      stock: producto.stock,
      stockMinimo: producto.stockMinimo,
      proveedor: producto.proveedor,
      imagen: producto.imagen ?? null
    };
    this.limpiarVistaPrevia();
    this.vistaPreviaImagen = this.api.imageUrl(producto.imagen);
    this.productoEdicionId = producto.id;
    this.modoEdicion = true;
    this.mostrarModal = true;
    this.mensaje = null;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.limpiarVistaPrevia();
    this.productoForm = this.nuevoProducto();
    this.modoEdicion = false;
    this.productoEdicionId = null;
    this.mensaje = null;
  }

  guardar(): void {
    const form = this.productoForm;
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
      if (this.productoEdicionId === null) {
        this.mensaje = { tipo: 'error', texto: 'No se pudo identificar el producto que se desea actualizar' };
        return;
      }
      this.productosService.actualizarProducto(
        this.productoEdicionId,
        this.productoForm,
        this.imagenSeleccionada
      ).subscribe(resultado => {
        this.procesarGuardado(resultado.success, resultado.mensaje);
      });
    } else {
      this.productosService.crearProducto(this.productoForm, this.imagenSeleccionada).subscribe(resultado => {
        this.procesarGuardado(resultado.success, resultado.mensaje);
      });
    }
  }

  seleccionarImagen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const image = input.files?.[0];
    if (!image) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      this.mensaje = { tipo: 'error', texto: 'Selecciona una imagen JPG, PNG o WebP' };
      input.value = '';
      return;
    }
    if (image.size > 5 * 1024 * 1024) {
      this.mensaje = { tipo: 'error', texto: 'La imagen no puede superar los 5 MB' };
      input.value = '';
      return;
    }

    this.limpiarVistaPrevia();
    this.imagenSeleccionada = image;
    this.vistaPreviaImagen = URL.createObjectURL(image);
  }

  quitarImagenSeleccionada(): void {
    this.limpiarVistaPrevia();
    this.vistaPreviaImagen = this.api.imageUrl(this.productoForm.imagen);
  }

  private limpiarVistaPrevia(): void {
    if (this.vistaPreviaImagen?.startsWith('blob:')) {
      URL.revokeObjectURL(this.vistaPreviaImagen);
    }
    this.imagenSeleccionada = null;
    this.vistaPreviaImagen = null;
  }

  private procesarGuardado(success: boolean, mensaje?: string): void {
    if (success) {
      this.mensaje = {
        tipo: 'success',
        texto: this.modoEdicion ? '✅ Producto actualizado' : '✅ Producto registrado'
      };
      setTimeout(() => this.cerrarModal(), 800);
    } else {
      this.mensaje = { tipo: 'error', texto: mensaje || 'Error' };
    }
  }

  eliminar(producto: Producto): void {
    if (confirm(`¿Eliminar el producto ${producto.nombre}?`)) {
      this.productosService.eliminarProducto(producto.id).subscribe(resultado => {
        this.mensaje = resultado.success
          ? { tipo: 'success', texto: '✅ Producto eliminado' }
          : { tipo: 'error', texto: resultado.mensaje || 'Error al eliminar' };
        setTimeout(() => this.mensaje = null, 3000);
      });
    }
  }

  agregarAlCarrito(producto: Producto): void {
    const cantidad = this.cantidades[producto.id] || 1;
    const resultado = this.carritoService.agregarProducto(producto, cantidad);

    if (resultado.success) {
      this.mensaje = { tipo: 'success', texto: `✅ ${producto.nombre} agregado al carrito` };
      this.cantidades[producto.id] = 1;
      setTimeout(() => this.mensaje = null, 2500);
    } else {
      this.mensaje = { tipo: 'error', texto: resultado.mensaje || 'Error' };
      setTimeout(() => this.mensaje = null, 3500);
    }
  }

  // Helpers para el diseño
  stockBajo(p: Producto): boolean {
    return p.stock <= p.stockMinimo && p.stock > 0;
  }

  sinStock(p: Producto): boolean {
    return p.stock === 0;
  }
}