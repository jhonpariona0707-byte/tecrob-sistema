import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';

export interface Cliente {
  id: number;
  tipoDocumento: 'DNI' | 'RUC' | 'Pasaporte' | 'Carnet Extranjeria';
  numDocumento: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  email: string;
  direccion: string;
  referencia: string;
  fechaRegistro: string;
}

export interface OperationResult {
  success: boolean;
  mensaje?: string;
}

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly clientesSubject = new BehaviorSubject<Cliente[]>([]);
  readonly clientes$: Observable<Cliente[]> = this.clientesSubject.asObservable();

  constructor(private api: ApiService) {
    this.cargarClientes();
  }

  getClientes(): Cliente[] {
    return this.clientesSubject.value;
  }

  getClientePorId(id: number): Cliente | undefined {
    return this.clientesSubject.value.find(cliente => cliente.id === id);
  }

  crearCliente(cliente: Omit<Cliente, 'id' | 'fechaRegistro'>): Observable<OperationResult> {
    return this.api.post<Cliente>('/clientes', cliente).pipe(
      tap(created => this.clientesSubject.next([created, ...this.clientesSubject.value])),
      map(() => ({ success: true })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  actualizarCliente(id: number, cliente: Omit<Cliente, 'id' | 'fechaRegistro'>): Observable<OperationResult> {
    return this.api.put<Cliente>(`/clientes/${id}`, cliente).pipe(
      tap(updated => this.clientesSubject.next(
        this.clientesSubject.value.map(item => item.id === id ? updated : item)
      )),
      map(() => ({ success: true })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  eliminarCliente(id: number): Observable<OperationResult> {
    return this.api.delete(`/clientes/${id}`).pipe(
      tap(() => this.clientesSubject.next(this.clientesSubject.value.filter(item => item.id !== id))),
      map(() => ({ success: true })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  buscarClientes(texto: string): Cliente[] {
    if (!texto) return this.clientesSubject.value;
    const term = texto.toLowerCase();
    return this.clientesSubject.value.filter(cliente =>
      cliente.nombre.toLowerCase().includes(term) ||
      cliente.apellidos.toLowerCase().includes(term) ||
      cliente.numDocumento.includes(term) ||
      cliente.telefono.includes(term)
    );
  }

  private cargarClientes(): void {
    this.api.get<Cliente[]>('/clientes').subscribe({
      next: clientes => this.clientesSubject.next(clientes),
      error: error => console.error(this.api.message(error))
    });
  }
}
