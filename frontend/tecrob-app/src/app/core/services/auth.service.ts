import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'tecnico';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private usuarioSubject = new BehaviorSubject<Usuario | null>(null);
  public usuario$: Observable<Usuario | null> = this.usuarioSubject.asObservable();

  // Credenciales demo (luego se reemplazan con backend Spring Boot)
  private readonly CREDENCIALES_DEMO = [
    { id: 1, nombre: 'Administrador', email: 'admin@tecrob.com', password: 'admin123', rol: 'admin' as const },
    { id: 2, nombre: 'Carlos Pérez', email: 'carlos@tecrob.com', password: 'admin123', rol: 'tecnico' as const },
    { id: 3, nombre: 'María Gómez', email: 'maria@tecrob.com', password: 'admin123', rol: 'tecnico' as const },
    { id: 4, nombre: 'Luis Torres', email: 'luis@tecrob.com', password: 'admin123', rol: 'tecnico' as const }
  ];

  constructor(private router: Router) {
    // Restaurar sesión desde localStorage
    const usuarioGuardado = localStorage.getItem('tecrob_usuario');
    if (usuarioGuardado) {
      this.usuarioSubject.next(JSON.parse(usuarioGuardado));
    }
  }

  login(email: string, password: string): { success: boolean; mensaje?: string } {
    const usuario = this.CREDENCIALES_DEMO.find(
      u => u.email === email && u.password === password
    );

    if (!usuario) {
      return { success: false, mensaje: 'Credenciales incorrectas' };
    }

    const usuarioLogueado: Usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    };

    // Guardar en localStorage
    localStorage.setItem('tecrob_usuario', JSON.stringify(usuarioLogueado));

    // Actualizar el observable
    this.usuarioSubject.next(usuarioLogueado);

    return { success: true };
  }

  logout(): void {
    localStorage.removeItem('tecrob_usuario');
    this.usuarioSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.usuarioSubject.value !== null;
  }

  getUsuario(): Usuario | null {
    return this.usuarioSubject.value;
  }
}