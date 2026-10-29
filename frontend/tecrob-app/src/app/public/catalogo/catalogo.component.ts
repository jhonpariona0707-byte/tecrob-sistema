import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CATEGORIAS_PRODUCTOS, Producto } from '../../core/services/productos.service';
import { ApiService } from '../../core/services/api.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss'
})
export class CatalogoComponent implements OnInit {

  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  categorias: string[] = [];

  buscar: string = '';
  categoriaFiltro: string = '';
  pagina = 1;
  filasPorPagina = 12;

  whatsappNumero = '51943582185';

  constructor(
    readonly api: ApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.categorias = CATEGORIAS_PRODUCTOS;

    this.route.queryParamMap.subscribe(params => {
      const categoria = params.get('categoria') ?? '';
      this.categoriaFiltro = this.categorias.includes(categoria) ? categoria : '';
      this.filtrar();
    });

    this.api.get<Producto[]>('/public/productos').subscribe(productos => {
      this.productos = productos;
      this.filtrar();
    });
  }

  filtrar(): void {
    let resultado = this.productos;

    if (this.buscar) {
      const t = this.buscar.toLowerCase();
      resultado = resultado.filter(p =>
        p.nombre.toLowerCase().includes(t) ||
        p.codigo.toLowerCase().includes(t) ||
        p.descripcion.toLowerCase().includes(t)
      );
    }

    if (this.categoriaFiltro) {
      resultado = resultado.filter(p => p.categoria === this.categoriaFiltro);
    }

    this.productosFiltrados = resultado;
    this.pagina = 1;
  }

  consultarWhatsApp(producto: Producto): string {
    const mensaje = `Hola%2C%20estoy%20interesado%20en%20el%20producto%20${producto.nombre}%20(${producto.codigo})%20con%20precio%20de%20S%2F%20${producto.precioVenta}`;
    return `https://wa.me/${this.whatsappNumero}?text=${mensaje}`;
  }
}