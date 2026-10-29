import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientesService, Cliente } from '../../core/services/clientes.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss'
})
export class ClientesComponent implements OnInit {

  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  buscar: string = '';
  pagina = 1;
  filasPorPagina = 10;

  // Modal
  mostrarModal: boolean = false;
  modoEdicion: boolean = false;

  // Formulario
  clienteForm: Omit<Cliente, 'id' | 'fechaRegistro'> = this.nuevoCliente();

  mensaje: { tipo: 'success' | 'error'; texto: string } | null = null;

  constructor(private clientesService: ClientesService) {}

  ngOnInit(): void {
    this.clientesService.clientes$.subscribe(clientes => {
      this.clientes = clientes;
      this.filtrar();
    });
  }

  nuevoCliente(): Omit<Cliente, 'id' | 'fechaRegistro'> {
    return {
      tipoDocumento: 'DNI',
      numDocumento: '',
      nombre: '',
      apellidos: '',
      telefono: '',
      email: '',
      direccion: '',
      referencia: ''
    };
  }

  filtrar(): void {
    this.clientesFiltrados = this.clientesService.buscarClientes(this.buscar);
    this.pagina = 1;
  }

  abrirModalNuevo(): void {
    this.clienteForm = this.nuevoCliente();
    this.modoEdicion = false;
    this.mostrarModal = true;
    this.mensaje = null;
  }

  abrirModalEditar(cliente: Cliente): void {
    this.clienteForm = {
      tipoDocumento: cliente.tipoDocumento,
      numDocumento: cliente.numDocumento,
      nombre: cliente.nombre,
      apellidos: cliente.apellidos,
      telefono: cliente.telefono,
      email: cliente.email,
      direccion: cliente.direccion,
      referencia: cliente.referencia
    };
    this.modoEdicion = true;
    this.mostrarModal = true;
    this.mensaje = null;
    // Guardar el ID en el objeto temporal
    (this.clienteForm as any).id = cliente.id;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.clienteForm = this.nuevoCliente();
    this.modoEdicion = false;
    this.mensaje = null;
  }

  guardar(): void {
    const documento = this.clienteForm.numDocumento.trim();
    const correo = this.clienteForm.email.trim();
    if (!documento || !this.clienteForm.nombre.trim() || !this.clienteForm.apellidos.trim()) {
      this.mensaje = { tipo: 'error', texto: 'Por favor, complete los campos obligatorios' };
      return;
    }
    if (!/^[A-Za-z0-9.-]{5,20}$/.test(documento)) {
      this.mensaje = { tipo: 'error', texto: 'El documento debe tener entre 5 y 20 caracteres válidos' };
      return;
    }
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      this.mensaje = { tipo: 'error', texto: 'Ingrese un correo electrónico válido' };
      return;
    }
    this.clienteForm.numDocumento = documento;

    if (this.modoEdicion) {
      const id = (this.clienteForm as any).id;
      this.clientesService.actualizarCliente(id, this.clienteForm).subscribe(resultado => {
        this.procesarGuardado(resultado.success, resultado.mensaje);
      });
    } else {
      this.clientesService.crearCliente(this.clienteForm).subscribe(resultado => {
        this.procesarGuardado(resultado.success, resultado.mensaje);
      });
    }
  }

  private procesarGuardado(success: boolean, mensaje?: string): void {
    if (success) {
      this.mensaje = {
        tipo: 'success',
        texto: this.modoEdicion ? '✅ Cliente actualizado correctamente' : '✅ Cliente registrado correctamente'
      };

      setTimeout(() => {
        this.cerrarModal();
      }, 800);
    } else {
      this.mensaje = { tipo: 'error', texto: mensaje || 'Error' };
    }
  }

  eliminar(cliente: Cliente): void {
    if (confirm(`¿Eliminar al cliente ${cliente.nombre} ${cliente.apellidos}?`)) {
      this.clientesService.eliminarCliente(cliente.id).subscribe(resultado => {
        if (resultado.success) {
          this.mensaje = { tipo: 'success', texto: '✅ Cliente eliminado correctamente' };
          setTimeout(() => this.mensaje = null, 3000);
        } else {
          this.mensaje = { tipo: 'error', texto: resultado.mensaje || 'Error al eliminar' };
          setTimeout(() => this.mensaje = null, 4000);
        }
      });
    }
  }
}