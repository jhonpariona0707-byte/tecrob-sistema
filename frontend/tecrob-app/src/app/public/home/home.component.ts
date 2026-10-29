import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Producto } from '../../core/services/productos.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  productosDestacados: Producto[] = [];
  whatsappNumero = '51943582185';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<Producto[]>('/public/productos').subscribe(productos => {
      this.productosDestacados = productos.slice(0, 4);
    });
  }

  consultarWhatsApp(producto: Producto): string {
    const mensaje = `Hola%2C%20estoy%20interesado%20en%20el%20producto%20${producto.nombre}%20(${producto.codigo})`;
    return `https://wa.me/${this.whatsappNumero}?text=${mensaje}`;
  }
}