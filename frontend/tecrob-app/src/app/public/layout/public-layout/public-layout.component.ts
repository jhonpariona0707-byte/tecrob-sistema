import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss'
})
export class PublicLayoutComponent {

  whatsappNumero = '51943582185';
  whatsappMensaje = 'Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20TecRob';

  menuCatalogoAbierto = false;
  menuNosotrosAbierto = false;

  categoriasCatalogo = [
    { nombre: 'Laptops', categoria: 'Laptops' },
    { nombre: 'Monitores', categoria: 'Monitores' },
    { nombre: 'Tablets', categoria: 'Tablets' },
    { nombre: 'Placas madre', categoria: 'Placas Madre' },
    { nombre: 'Discos sólidos SSD', categoria: 'SSD & NVMe' },
    { nombre: 'Memorias RAM', categoria: 'Memoria Ram' }
  ];

  herramientasCatalogo = [
    { nombre: 'Lista de precios', link: '/productos' },
    { nombre: 'Productos por marca', link: '/productos' },
    { nombre: 'Productos por tipo', link: '/productos' },
    { nombre: 'Buscador de productos', link: '/productos' },
    { nombre: 'Descargar catálogos', link: '/productos' }
  ];

  whatsappLink(): string {
    return `https://wa.me/${this.whatsappNumero}?text=${this.whatsappMensaje}`;
  }

  toggleCatalogo(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.menuCatalogoAbierto = !this.menuCatalogoAbierto;
    this.menuNosotrosAbierto = false;
  }

  toggleNosotros(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.menuNosotrosAbierto = !this.menuNosotrosAbierto;
    this.menuCatalogoAbierto = false;
  }

  cerrarMenus(): void {
    this.menuCatalogoAbierto = false;
    this.menuNosotrosAbierto = false;
  }

  @HostListener('document:click', ['$event'])
  clickFuera(event: MouseEvent): void {
    if (event.target instanceof Element && !event.target.closest('.menu-container')) {
      this.cerrarMenus();
    }
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    this.cerrarMenus();
  }
}
