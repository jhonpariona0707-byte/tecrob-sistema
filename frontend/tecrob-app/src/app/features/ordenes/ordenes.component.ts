import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrdenesService, Orden, RepuestoUsado } from '../../core/services/ordenes.service';
import { RepuestosService, Repuesto } from '../../core/services/repuestos.service';

@Component({
  selector: 'app-ordenes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ordenes.component.html',
  styleUrl: './ordenes.component.scss'
})
export class OrdenesComponent implements OnInit {

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
    manoObra: 0,
    subtotal: 0,
    adelanto: 0,
    saldo: 0,
    total: 0,
    repuestosUsados: [] as RepuestoUsado[]
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

  // Repuestos
  repuestosDisponibles: Repuesto[] = [];
  repuestosFiltrados: Repuesto[] = [];
  repuestoSeleccionado: Repuesto | null = null;
  cantidadRepuesto: number = 1;
  buscarRepuesto: string = '';

  guardado: boolean = false;
  ordenGenerada: Orden | null = null;

  constructor(
    private ordenesService: OrdenesService,
    private repuestosService: RepuestosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.ordenesService.recargar();
    this.repuestosService.repuestos$.subscribe(repuestos => {
      this.repuestosDisponibles = repuestos;
      this.repuestosFiltrados = repuestos;
    });
  }

  toggleAccesorio(accesorio: any): void {
    accesorio.seleccionado = !accesorio.seleccionado;
  }

  // ===== REPUESTOS =====
  filtrarRepuestos(): void {
    if (!this.buscarRepuesto) {
      this.repuestosFiltrados = this.repuestosDisponibles;
      return;
    }
    const t = this.buscarRepuesto.toLowerCase();
    this.repuestosFiltrados = this.repuestosDisponibles.filter(r =>
      r.nombre.toLowerCase().includes(t) ||
      r.codigo.toLowerCase().includes(t)
    );
  }

  agregarRepuesto(): void {
    if (!this.repuestoSeleccionado) {
      alert('Seleccione un repuesto primero');
      return;
    }

    if (this.cantidadRepuesto <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    if (this.cantidadRepuesto > this.repuestoSeleccionado.stock) {
      alert(`Stock insuficiente. Disponible: ${this.repuestoSeleccionado.stock}`);
      return;
    }

    const existente = this.orden.repuestosUsados.find(
      r => r.repuestoId === this.repuestoSeleccionado!.id
    );

    if (existente) {
      existente.cantidad += this.cantidadRepuesto;
      existente.subtotal = existente.cantidad * existente.precioUnitario;
    } else {
      this.orden.repuestosUsados.push({
        repuestoId: this.repuestoSeleccionado.id,
        codigo: this.repuestoSeleccionado.codigo,
        nombre: this.repuestoSeleccionado.nombre,
        cantidad: this.cantidadRepuesto,
        precioUnitario: this.repuestoSeleccionado.precioVenta,
        subtotal: this.cantidadRepuesto * this.repuestoSeleccionado.precioVenta
      });
    }

    this.recalcularSubtotal();

    this.repuestoSeleccionado = null;
    this.cantidadRepuesto = 1;
    this.buscarRepuesto = '';
    this.repuestosFiltrados = this.repuestosDisponibles;
  }

  eliminarRepuesto(index: number): void {
    this.orden.repuestosUsados.splice(index, 1);
    this.recalcularSubtotal();
  }

  // SUB-TOTAL = Mano de Obra + Repuestos
  recalcularSubtotal(): void {
    const subtotalRepuestos = this.orden.repuestosUsados.reduce(
      (acc, r) => acc + r.subtotal, 0
    );
    this.orden.subtotal = (this.orden.manoObra || 0) + subtotalRepuestos;
  }

  onManoObraChange(): void {
    this.recalcularSubtotal();
  }

  get totalRepuestos(): number {
    return this.orden.repuestosUsados.reduce((acc, r) => acc + r.subtotal, 0);
  }

  // ===== GENERAR ORDEN =====
  generarOrden(): void {
    this.orden.cliente.dni = this.orden.cliente.dni.trim();
    this.orden.cliente.nombre = this.orden.cliente.nombre.trim();
    this.orden.cliente.email = this.orden.cliente.email.trim();
    if (!/^[A-Za-z0-9.-]{5,20}$/.test(this.orden.cliente.dni) || !this.orden.cliente.nombre) {
      alert('Por favor, complete los datos del cliente');
      return;
    }

    if (this.orden.cliente.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.orden.cliente.email)) {
      alert('Ingrese un correo electrónico válido o deje el campo vacío');
      return;
    }

    if (!this.orden.equipo.marca.trim() || !this.orden.equipo.modelo.trim()) {
      alert('Por favor, complete los datos del equipo');
      return;
    }
    if (!Number.isFinite(this.orden.manoObra) || this.orden.manoObra < 0
        || !Number.isFinite(this.orden.adelanto) || this.orden.adelanto < 0) {
      alert('La mano de obra y el adelanto deben ser importes válidos y no negativos');
      return;
    }
    this.recalcularSubtotal();
    if (this.orden.adelanto > this.orden.subtotal) {
      alert('El adelanto no puede superar el total de la orden');
      return;
    }

    this.orden.accesorios = this.accesoriosDisponibles
      .filter(a => a.seleccionado)
      .map(a => a.nombre);

    this.ordenesService.crearOrden(this.orden).subscribe(resultado => {
      if (!resultado.orden) {
        alert(resultado.mensaje || 'No se pudo guardar la orden en la base de datos.');
        return;
      }

      this.ordenGenerada = resultado.orden;
      this.repuestosService.recargar();
      this.guardado = true;
      setTimeout(() => {
        this.router.navigate(['/admin/ticket', resultado.orden!.numOrden]);
      }, 800);
    });
  }

  limpiarFormulario(): void {
    if (confirm('¿Limpiar el formulario?')) {
      location.reload();
    }
  }
}