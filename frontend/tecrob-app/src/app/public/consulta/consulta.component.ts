import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdenesService, ConsultaOrden } from '../../core/services/ordenes.service';

@Component({
  selector: 'app-consulta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consulta.component.html',
  styleUrl: './consulta.component.scss'
})
export class ConsultaComponent {

  codigo: string = '';
  orden: ConsultaOrden | null = null;
  error: string = '';
  buscando: boolean = false;

  whatsappNumero = '51943582185';

  constructor(private ordenesService: OrdenesService) {}

  consultar(): void {
    this.error = '';
    this.orden = null;

    if (!this.codigo.trim()) {
      this.error = 'Por favor, ingresa un código de orden';
      return;
    }

    this.buscando = true;

    this.ordenesService.buscarOrdenPublica(this.codigo.trim()).subscribe(encontrada => {
      if (encontrada) this.orden = encontrada;
      else this.error = 'No se encontró ninguna orden con ese código. Verifica e intenta de nuevo.';
      this.buscando = false;
    });
  }

  getEstadoBadge(estado: string): string {
    switch(estado) {
      case 'Pendiente': return 'bg-yellow-500';
      case 'En reparación': return 'bg-blue-500';
      case 'Esperando repuesto': return 'bg-orange-500';
      case 'Reparado': return 'bg-green-500';
      case 'Entregado': return 'bg-tecrob-red';
      case 'No reparable': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  }

  getEstadoIcono(estado: string): string {
    switch(estado) {
      case 'Pendiente': return '⏳';
      case 'En reparación': return '🔧';
      case 'Esperando repuesto': return '📦';
      case 'Reparado': return '✅';
      case 'Entregado': return '📤';
      case 'No reparable': return '❌';
      default: return '📋';
    }
  }

  consultarWhatsApp(): string {
    const mensaje = `Hola%2C%20quiero%20consultar%20sobre%20mi%20orden%20${this.orden?.numOrden}`;
    return `https://wa.me/${this.whatsappNumero}?text=${mensaje}`;
  }

  limpiar(): void {
    this.codigo = '';
    this.orden = null;
    this.error = '';
  }
}