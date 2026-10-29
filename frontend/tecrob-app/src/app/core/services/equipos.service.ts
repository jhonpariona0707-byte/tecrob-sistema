import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { OperationResult } from './clientes.service';

export interface Equipo {
  id: number;
  clienteId: number;
  clienteNombre: string;
  clienteDocumento: string;
  tipo: string;
  marca: string;
  modelo: string;
  serie: string;
  caracteristicas: string;
  contrasena: string;
  accesorios: string;
  fechaRegistro: string;
  ordenesCount?: number;
}

@Injectable({ providedIn: 'root' })
export class EquiposService {
  private readonly equiposSubject = new BehaviorSubject<Equipo[]>([]);
  readonly equipos$: Observable<Equipo[]> = this.equiposSubject.asObservable();

  readonly tiposEquipo = [
    'Laptop', 'PC Escritorio', 'All-in-One', 'Impresora', 'Fotocopiadora',
    'Tablet', 'Monitor', 'Servidor', 'Otro'
  ];

  constructor(private api: ApiService) {
    this.cargarEquipos();
  }

  getEquipos(): Equipo[] {
    return this.equiposSubject.value;
  }

  getEquipoPorId(id: number): Equipo | undefined {
    return this.equiposSubject.value.find(equipo => equipo.id === id);
  }

  getEquiposPorCliente(clienteId: number): Equipo[] {
    return this.equiposSubject.value.filter(equipo => equipo.clienteId === clienteId);
  }

  crearEquipo(equipo: Omit<Equipo, 'id' | 'fechaRegistro'>): Observable<OperationResult> {
    return this.api.post<Equipo>('/equipos', equipo).pipe(
      tap(created => this.equiposSubject.next([created, ...this.equiposSubject.value])),
      map(() => ({ success: true })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  actualizarEquipo(id: number, equipo: Omit<Equipo, 'id' | 'fechaRegistro'>): Observable<OperationResult> {
    return this.api.put<Equipo>(`/equipos/${id}`, equipo).pipe(
      tap(updated => this.equiposSubject.next(
        this.equiposSubject.value.map(item => item.id === id ? updated : item)
      )),
      map(() => ({ success: true })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  eliminarEquipo(id: number): Observable<OperationResult> {
    return this.api.delete(`/equipos/${id}`).pipe(
      tap(() => this.equiposSubject.next(this.equiposSubject.value.filter(item => item.id !== id))),
      map(() => ({ success: true })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  contarOrdenesPorEquipo(serie: string): number {
    return this.equiposSubject.value.find(equipo => equipo.serie === serie)?.ordenesCount ?? 0;
  }

  buscarEquipos(texto: string, clienteId: number | null = null): Equipo[] {
    let result = this.equiposSubject.value;
    if (clienteId) result = result.filter(equipo => equipo.clienteId === clienteId);
    if (texto) {
      const term = texto.toLowerCase();
      result = result.filter(equipo =>
        equipo.marca.toLowerCase().includes(term) ||
        equipo.modelo.toLowerCase().includes(term) ||
        equipo.serie.toLowerCase().includes(term) ||
        equipo.clienteNombre.toLowerCase().includes(term)
      );
    }
    return result;
  }

  private cargarEquipos(): void {
    this.api.get<Equipo[]>('/equipos').subscribe({
      next: devices => this.equiposSubject.next(devices),
      error: error => console.error(this.api.message(error))
    });
  }
}
