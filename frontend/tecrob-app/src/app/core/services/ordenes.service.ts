import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
  estado: 'Pendiente' | 'En reparación' | 'Reparado' | 'Entregado' | 'No reparable';
  responsable: string;
  subtotal: number;
  adelanto: number;
  saldo: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrdenesService {

  private ordenesSubject = new BehaviorSubject<Orden[]>([]);
  public ordenes$: Observable<Orden[]> = this.ordenesSubject.asObservable();

  private contador = 1;

  constructor() {
    const guardadas = localStorage.getItem('tecrob_ordenes');
    if (guardadas) {
      const ordenes = JSON.parse(guardadas);
      this.ordenesSubject.next(ordenes);
      this.contador = ordenes.length + 1;
    }
  }

  generarNumeroOrden(): string {
    const num = this.contador.toString().padStart(5, '0');
    return `V5-${num}`;
  }

  crearOrden(orden: Omit<Orden, 'id' | 'numOrden' | 'fechaIngreso'>): Orden {
    const nuevaOrden: Orden = {
      ...orden,
      id: this.contador,
      numOrden: this.generarNumeroOrden(),
      fechaIngreso: new Date().toISOString()
    };

    const ordenes = [...this.ordenesSubject.value, nuevaOrden];
    this.ordenesSubject.next(ordenes);
    localStorage.setItem('tecrob_ordenes', JSON.stringify(ordenes));

    this.contador++;
    return nuevaOrden;
  }

  getOrdenes(): Orden[] {
    return this.ordenesSubject.value;
  }

  getOrdenPorNumero(numOrden: string): Orden | undefined {
    return this.ordenesSubject.value.find(o => o.numOrden === numOrden);
  }
}