import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'tecnico';
}

export interface LoginResult {
  success: boolean;
  mensaje?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usuarioSubject = new BehaviorSubject<Usuario | null>(null);
  readonly usuario$: Observable<Usuario | null> = this.usuarioSubject.asObservable();
  private readonly sesionListaSubject = new BehaviorSubject(false);
  readonly sesionLista$ = this.sesionListaSubject.asObservable();

  constructor(private router: Router, private api: ApiService) {
    this.api.get<Usuario>('/auth/session', false).subscribe({
      next: user => {
        this.usuarioSubject.next(user);
        localStorage.setItem('tecrob_usuario', JSON.stringify(user));
        this.sesionListaSubject.next(true);
      },
      error: () => {
        this.usuarioSubject.next(null);
        localStorage.removeItem('tecrob_usuario');
        this.sesionListaSubject.next(true);
      }
    });
  }

  login(email: string, password: string): Observable<LoginResult> {
    return this.api.post<Usuario>('/auth/login', { email, password }).pipe(
      tap(user => {
        localStorage.setItem('tecrob_usuario', JSON.stringify(user));
        this.usuarioSubject.next(user);
      }),
      map(() => ({ success: true })),
      catchError(error => of({ success: false, mensaje: this.api.message(error) }))
    );
  }

  logout(): void {
    this.api.post<void>('/auth/logout', {}).subscribe({
      error: error => console.error(this.api.message(error))
    });
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
