import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';

export interface RepuestoUsado {
  repuestoId: number;
  codigo: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Orden {
  id: number;
  numOrden: string;
  fechaIngreso: string;
  fechaPrometida: string;
  cliente: {
    dni: string;
    nombre: string;
    telefono: string;
    email: string;
    direccion: string;
  };
  equipo: {
    tipo: string;
    marca: string;
    modelo: string;
    serie: string;
    descripcion: string;
  };
  area: string;
  tipoServicio: string;
  prioridad: string;
  observaciones: string;
  accesorios: string[];
  estado: 'Pendiente' | 'En reparación' | 'Esperando repuesto' | 'Reparado' | 'Entregado' | 'No reparable';
  responsable: string;
  subtotal: number;
  adelanto: number;
  saldo: number;
  total: number;
  manoObra?: number;
  repuestosUsados: RepuestoUsado[];
  seguimiento: {
    estadoAnterior: string | null;
    estado: Orden['estado'];
    comentario: string;
    fecha: string;
    responsable: string;
  }[];
}

export interface ConsultaOrden {
  numOrden: string;
  estado: Orden['estado'];
  fechaPrometida: string | null;
  prioridad: string;
  tipoServicio: string;
  seguimiento: {
    estado: Orden['estado'];
    fecha: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private readonly ordenesSubject = new BehaviorSubject<Orden[]>([]);
  readonly ordenes$: Observable<Orden[]> = this.ordenesSubject.asObservable();

  constructor(private api: ApiService) {
  }

  recargar(): void {
    this.cargar().subscribe({
      error: error => console.error(this.api.message(error))
    });
  }

  cargar(): Observable<Orden[]> {
    return this.api.get<Orden[]>('/ordenes').pipe(
      tap(orders => this.ordenesSubject.next(orders))
    );
  }

  crearOrden(orden: Omit<Orden, 'id' | 'numOrden' | 'fechaIngreso' | 'seguimiento'>):
    Observable<{ orden: Orden | null; mensaje?: string }> {
    return this.api.post<Orden>('/ordenes', orden).pipe(
      tap(created => this.ordenesSubject.next([created, ...this.ordenesSubject.value])),
      map(created => ({ orden: created })),
      catchError(error => of({ orden: null, mensaje: this.api.message(error) }))
    );
  }

  cambiarEstado(numOrden: string, estado: Orden['estado'], comentario = ''): Observable<Orden | null> {
    return this.api.put<Orden>(`/ordenes/${encodeURIComponent(numOrden)}/estado`, {
      estado,
      comentario
    }).pipe(
      tap(updated => this.ordenesSubject.next(
        this.ordenesSubject.value.map(order => order.numOrden === numOrden ? updated : order)
      )),
      catchError(error => {
        console.error(this.api.message(error));
        return of(null);
      })
    );
  }

  getOrdenes(): Orden[] {
    return this.ordenesSubject.value;
  }

  getOrdenPorNumero(numOrden: string): Orden | undefined {
    return this.ordenesSubject.value.find(order => order.numOrden === numOrden);
  }

  buscarOrdenPorNumero(numOrden: string): Observable<Orden | null> {
    return this.api.get<Orden>(`/ordenes/${encodeURIComponent(numOrden)}`).pipe(
      catchError(() => of(null))
    );
  }

  buscarOrdenPublica(numOrden: string): Observable<ConsultaOrden | null> {
    return this.api.get<ConsultaOrden>(`/consulta/${encodeURIComponent(numOrden)}`).pipe(
      catchError(() => of(null))
    );
  }

}
