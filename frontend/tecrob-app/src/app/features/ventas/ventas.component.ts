import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentasService, Venta } from '../../core/services/ventas.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { downloadCsv, localDateStamp } from '../../core/utils/csv-export';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.scss'
})
export class VentasComponent implements OnInit {

  ventas: Venta[] = [];
  ventasFiltradas: Venta[] = [];

  fechaDesde: string = '';
  fechaHasta: string = '';
  estadoFiltro: string = '';
  buscar = '';
  pagina = 1;
  filasPorPagina = 10;

  ventaSeleccionada: Venta | null = null;

  // Estadísticas
  totalVentas: number = 0;
  cantidadVentas: number = 0;
  promedioVenta: number = 0;

  constructor(private ventasService: VentasService) {}

  ngOnInit(): void {
    this.ventasService.ventas$.subscribe(ventas => {
      this.ventas = ventas;
      this.filtrar();
      this.calcularEstadisticas();
    });
  }

  filtrar(): void {
    this.ventasFiltradas = this.ventasService.filtrarVentas(
      this.fechaDesde,
      this.fechaHasta,
      this.estadoFiltro
    );
    const termino = this.buscar.trim().toLocaleLowerCase();
    if (termino) {
      this.ventasFiltradas = this.ventasFiltradas.filter(venta =>
        [
          venta.numFactura,
          venta.clienteNombre,
          venta.clienteDocumento,
          venta.usuario,
          venta.metodoPago,
          ...venta.items.map(item => `${item.codigo} ${item.nombre}`)
        ].some(valor => valor.toLocaleLowerCase().includes(termino))
      );
    }
    this.pagina = 1;
    this.calcularEstadisticas();
  }

  limpiarFiltros(): void {
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.estadoFiltro = '';
    this.buscar = '';
    this.filtrar();
  }

  calcularEstadisticas(): void {
    const pagadas = this.ventasFiltradas.filter(v => v.estado === 'Pagado');
    this.cantidadVentas = pagadas.length;
    this.totalVentas = pagadas.reduce((acc, v) => acc + v.total, 0);
    this.promedioVenta = pagadas.length > 0 ? this.totalVentas / pagadas.length : 0;
  }

  verDetalle(venta: Venta): void {
    this.ventaSeleccionada = venta;
  }

  cerrarDetalle(): void {
    this.ventaSeleccionada = null;
  }

  exportarVentas(): void {
    const rows = this.ventasFiltradas.map(venta => [
      venta.numFactura,
      venta.fecha,
      venta.tipoComprobante,
      venta.estado,
      venta.clienteNombre,
      venta.clienteDocumento,
      venta.usuario,
      venta.metodoPago,
      venta.subtotal.toFixed(2),
      venta.igv.toFixed(2),
      venta.total.toFixed(2),
      venta.items.reduce((total, item) => total + item.cantidad, 0),
      venta.items.map(item => `${item.codigo} - ${item.nombre} x ${item.cantidad}`).join(' | ')
    ]);

    downloadCsv(
      `reporte-ventas-${localDateStamp()}.csv`,
      [
        'N° comprobante', 'Fecha', 'Tipo comprobante', 'Estado', 'Cliente', 'Documento',
        'Usuario', 'Método de pago', 'Subtotal', 'IGV', 'Total', 'Unidades', 'Productos'
      ],
      rows
    );
  }

  // Helper para el badge de estado
  getEstadoBadge(estado: string): string {
    switch(estado) {
      case 'Pagado': return 'bg-green-500';
      case 'Pendiente': return 'bg-yellow-500';
      case 'Anulado': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }
}