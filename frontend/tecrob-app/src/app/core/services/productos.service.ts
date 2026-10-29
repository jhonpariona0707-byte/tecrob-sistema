import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { OperationResult } from './clientes.service';

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  proveedor: string;
  imagen?: string | null;
  fechaRegistro: string;
}

export const CATEGORIAS_PRODUCTOS: string[] = [
  'Laptops', 'Computadoras', 'Impresoras', 'Sillas Gamer', 'Monitores', 'ALL IN ONE',
  'Proyectores', 'Tablets', 'Punto De Venta', 'Procesadores', 'Placas Madre', 'Memoria Ram',
  'SSD & NVMe', 'Tarjeta De Video', 'Cases', 'Fuentes', 'Refrigeracion Liquida',
  'Refrigeracion Aire', 'Pasta Termica', 'Componentes', 'Periféricos', 'Teclados', 'Mouses',
  'Audifonos', 'Parlantes', 'Camara Web', 'Microfonos', 'Mouse Pad', 'Accesorios',
  'Red - Wifi', 'Estabilizadores', 'Ups', 'Ecran', 'Accesorios PC', 'Accesorios Laptop',
  'Suministros', 'Repuestos'
];

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly productosSubject = new BehaviorSubject<Producto[]>([]);
  readonly productos$: Observable<Producto[]> = this.productosSubject.asObservable();

  readonly categorias = CATEGORIAS_PRODUCTOS;

  constructor(private api: ApiService) {}

  getProductos(): Producto[] {
    return this.productosSubject.value;
  }

  getProductoPorId(id: number): Producto | undefined {
    return this.productosSubject.value.find(producto => producto.id === id);
  }

  recargar(): void {
    this.cargarProductos();
  }

  crearProducto(
    producto: Omit<Producto, 'id' | 'fechaRegistro'>,
    imagen?: File | null
  ): Observable<OperationResult> {
    return this.guardarConImagen(imagen, imagePath =>
      this.api.post<Producto>('/productos', { ...producto, ...(imagePath ? { imagen: imagePath } : {}) })
    ).pipe(
      tap(created => this.productosSubject.next([created, ...this.productosSubject.value])),
      map(() => ({ success: true })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  actualizarProducto(
    id: number,
    producto: Omit<Producto, 'id' | 'fechaRegistro'>,
    imagen?: File | null
  ): Observable<OperationResult> {
    const previousImage = this.getProductoPorId(id)?.imagen;
    return this.guardarConImagen(imagen, imagePath =>
      this.api.put<Producto>(`/productos/${id}`, { ...producto, ...(imagePath ? { imagen: imagePath } : {}) })
    ).pipe(
      tap(updated => {
        this.productosSubject.next(
          this.productosSubject.value.map(item => item.id === id ? updated : item)
        );
        if (imagePathChanged(previousImage, updated.imagen)) {
          this.eliminarImagen(previousImage);
        }
      }),
      map(() => ({ success: true })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  eliminarProducto(id: number): Observable<OperationResult> {
    const imagePath = this.getProductoPorId(id)?.imagen;
    return this.api.delete(`/productos/${id}`).pipe(
      tap(() => {
        this.productosSubject.next(this.productosSubject.value.filter(item => item.id !== id));
        this.eliminarImagen(imagePath);
      }),
      map(() => ({ success: true })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  buscarProductos(texto: string, categoria = ''): Producto[] {
    let result = this.productosSubject.value;
    if (texto) {
      const term = texto.toLowerCase();
      result = result.filter(producto =>
        producto.nombre.toLowerCase().includes(term) ||
        producto.codigo.toLowerCase().includes(term) ||
        producto.descripcion.toLowerCase().includes(term)
      );
    }
    if (categoria) result = result.filter(producto => producto.categoria === categoria);
    return result;
  }

  private cargarProductos(): void {
    this.api.get<Producto[]>('/productos').subscribe({
      next: products => this.productosSubject.next(products),
      error: error => console.error(this.api.message(error))
    });
  }

  private guardarConImagen<T>(
    image: File | null | undefined,
    save: (imagePath: string | null) => Observable<T>
  ): Observable<T> {
    const upload: Observable<string | null> = image
      ? this.subirImagen(image).pipe(map(result => result.imagen))
      : of(null);

    return upload.pipe(
      switchMap(imagePath => save(imagePath).pipe(
        catchError(error => {
          if (!imagePath) {
            return throwError(() => error);
          }
          return this.api.delete(`/productos/imagenes/${this.filename(imagePath)}`).pipe(
            catchError(cleanupError => {
              console.error(`No se pudo limpiar la imagen subida: ${this.api.message(cleanupError)}`);
              return of(undefined);
            }),
            switchMap(() => throwError(() => error))
          );
        })
      ))
    );
  }

  private subirImagen(image: File): Observable<{ imagen: string }> {
    const data = new FormData();
    data.append('imagen', image, image.name);
    return this.api.post<{ imagen: string }>('/productos/imagenes', data);
  }

  private eliminarImagen(imagePath: string | null | undefined): void {
    if (!imagePath?.startsWith('/uploads/products/')) {
      return;
    }
    this.api.delete(`/productos/imagenes/${this.filename(imagePath)}`).subscribe({
      error: error => console.error(`No se pudo eliminar la imagen anterior: ${this.api.message(error)}`)
    });
  }

  private filename(imagePath: string): string {
    return imagePath.slice(imagePath.lastIndexOf('/') + 1);
  }
}

function imagePathChanged(previous: string | null | undefined, current: string | null | undefined): boolean {
  return Boolean(previous && previous !== current);
}
