import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { OperationResult } from './clientes.service';

export interface Repuesto {
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
  ubicacion: string;
  fechaRegistro: string;
}

@Injectable({ providedIn: 'root' })
export class RepuestosService {
  private readonly repuestosSubject = new BehaviorSubject<Repuesto[]>([]);
  readonly repuestos$: Observable<Repuesto[]> = this.repuestosSubject.asObservable();

  readonly categorias: string[] = [
    'Discos Duros', 'Memorias RAM', 'Fuentes de Poder', 'Tarjetas Madre', 'Procesadores',
    'Ventiladores', 'Cables', 'Conectores', 'Pantallas', 'Teclados', 'Baterías', 'Cargadores', 'Otros'
  ];

  constructor(private api: ApiService) {
    this.cargarRepuestos();
  }

  getRepuestos(): Repuesto[] {
    return this.repuestosSubject.value;
  }

  getRepuestoPorId(id: number): Repuesto | undefined {
    return this.repuestosSubject.value.find(repuesto => repuesto.id === id);
  }

  recargar(): void {
    this.cargarRepuestos();
  }

  crearRepuesto(repuesto: Omit<Repuesto, 'id' | 'fechaRegistro'>): Observable<OperationResult> {
    return this.api.post<Repuesto>('/repuestos', repuesto).pipe(
      tap(created => this.repuestosSubject.next([created, ...this.repuestosSubject.value])),
      map(() => ({ success: true })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  actualizarRepuesto(id: number, repuesto: Omit<Repuesto, 'id' | 'fechaRegistro'>): Observable<OperationResult> {
    return this.api.put<Repuesto>(`/repuestos/${id}`, repuesto).pipe(
      tap(updated => this.repuestosSubject.next(
        this.repuestosSubject.value.map(item => item.id === id ? updated : item)
      )),
      map(() => ({ success: true })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  eliminarRepuesto(id: number): Observable<OperationResult> {
    return this.api.delete(`/repuestos/${id}`).pipe(
      tap(() => this.repuestosSubject.next(this.repuestosSubject.value.filter(item => item.id !== id))),
      map(() => ({ success: true })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  buscarRepuestos(texto: string, categoria = ''): Repuesto[] {
    let result = this.repuestosSubject.value;
    if (texto) {
      const term = texto.toLowerCase();
      result = result.filter(repuesto =>
        repuesto.nombre.toLowerCase().includes(term) ||
        repuesto.codigo.toLowerCase().includes(term) ||
        repuesto.descripcion.toLowerCase().includes(term)
      );
    }
    if (categoria) result = result.filter(repuesto => repuesto.categoria === categoria);
    return result;
  }

  private cargarRepuestos(): void {
    this.api.get<Repuesto[]>('/repuestos').subscribe({
      next: parts => this.repuestosSubject.next(parts),
      error: error => console.error(this.api.message(error))
    });
  }
}
