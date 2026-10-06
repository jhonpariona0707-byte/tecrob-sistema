import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrdenesService, Orden } from '../../core/services/ordenes.service';

@Component({
  selector: 'app-ordenes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ordenes.component.html',
  styleUrl: './ordenes.component.scss'
})
export class OrdenesComponent {

  orden = {
        cliente: {
      dni: '',
      nombre: '',
      telefono: '',
      email: '',
      direccion: ''
    },
    equipo: {
      tipo: 'COMPUTADORA',
      marca: '',
      modelo: '',
      serie: '',
      descripcion: ''
    },
    area: 'MANTENIMIENTO',
    tipoServicio: 'Mantenimiento',
    prioridad: 'Normal',
    observaciones: '',
    accesorios: [] as string[],
    estado: 'Pendiente' as Orden['estado'],
        responsable: '',
    fechaPrometida: '',
    subtotal: 0,
    adelanto: 0,
    saldo: 0,
    total: 0
  };

  tiposEquipo = ['COMPUTADORA', 'IMPRESORA', 'FOTOCOPIADORA', 'TABLET', 'PARLANTE', 'TODO EN UNO', 'OTROS EQUIPOS', 'DISCO DURO', 'SSD', 'GAME STICK LITE'];
  areas = ['MANTENIMIENTO', 'SISTEMAS', 'ADMINISTRACION', 'CONTABILIDAD'];
  tiposServicio = ['Mantenimiento', 'Reparación', 'Instalación', 'Diagnóstico'];
  prioridades = ['Normal', 'Urgente', 'Extrema'];

  accesoriosDisponibles = [
    { nombre: 'FORRO', seleccionado: false },
    { nombre: 'SWITCH', seleccionado: false },
    { nombre: 'MOCHILA', seleccionado: false },
    { nombre: 'CABLE DE ENERGIA', seleccionado: false },
    { nombre: 'CABLE DE DATOS', seleccionado: false },
    { nombre: 'PROTECTOR DE TECLADO', seleccionado: false },
    { nombre: 'ESTABILIZADOR', seleccionado: false },
    { nombre: 'CARGADOR', seleccionado: false }
  ];

  guardado: boolean = false;
  ordenGenerada: Orden | null = null;

  constructor(
    private ordenesService: OrdenesService,
    private router: Router
  ) {}

  toggleAccesorio(accesorio: any): void {
    accesorio.seleccionado = !accesorio.seleccionado;
  }

  generarOrden(): void {
    if (!this.orden.cliente.dni || !this.orden.cliente.nombre) {
      alert('Por favor, complete los datos del cliente');
      return;
    }

    if (!this.orden.equipo.marca || !this.orden.equipo.modelo) {
      alert('Por favor, complete los datos del equipo');
      return;
    }

    this.orden.accesorios = this.accesoriosDisponibles
      .filter(a => a.seleccionado)
      .map(a => a.nombre);

    const nuevaOrden = this.ordenesService.crearOrden(this.orden);

    this.ordenGenerada = nuevaOrden;
    this.guardado = true;

    setTimeout(() => {
      this.router.navigate(['/ticket', nuevaOrden.numOrden]);
    }, 800);
  }

  limpiarFormulario(): void {
    if (confirm('¿Limpiar el formulario?')) {
      location.reload();
    }
  }
}