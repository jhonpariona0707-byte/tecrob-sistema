import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdenesService, Orden } from '../../../core/services/ordenes.service';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket.component.html',
  styleUrl: './ticket.component.scss'
})
export class TicketComponent implements OnInit, AfterViewInit {

  @ViewChild('qrCanvas') qrCanvas!: ElementRef;
  @ViewChild('qrCanvas2') qrCanvas2!: ElementRef;
  @ViewChild('barcode1') barcode1!: ElementRef;
  @ViewChild('barcode2') barcode2!: ElementRef;
  @ViewChild('barcode3') barcode3!: ElementRef;

  orden: Orden | undefined;

  constructor(
    private route: ActivatedRoute,
    private ordenesService: OrdenesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const numOrden = this.route.snapshot.paramMap.get('numOrden');
    if (numOrden) {
      this.orden = this.ordenesService.getOrdenPorNumero(numOrden);
    }
  }

  ngAfterViewInit(): void {
    if (this.orden) {
      setTimeout(() => {
        this.generarQRs();
        this.generarCodigosBarras();
      }, 200);
    }
  }

  async generarQRs(): Promise<void> {
    if (this.orden) {
      const texto = `TecRob | Orden: ${this.orden.numOrden} | Cliente: ${this.orden.cliente.nombre}`;

      if (this.qrCanvas) {
        await QRCode.toCanvas(this.qrCanvas.nativeElement, texto, { width: 80 });
      }
      if (this.qrCanvas2) {
        await QRCode.toCanvas(this.qrCanvas2.nativeElement, texto, { width: 80 });
      }
    }
  }

  generarCodigosBarras(): void {
    if (this.orden) {
      const valor = this.orden.numOrden;
      const opciones = {
        format: 'CODE128',
        width: 1.5,
        height: 35,
        displayValue: true,
        fontSize: 10,
        margin: 0
      };

      [this.barcode1, this.barcode2, this.barcode3].forEach(ref => {
        if (ref) {
          JsBarcode(ref.nativeElement, valor, opciones);
        }
      });
    }
  }

  imprimir(): void {
    window.print();
  }

  volver(): void {
    this.router.navigate(['/ordenes']);
  }
}