import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:8080/api';
  private readonly origin = this.baseUrl.replace(/\/api$/, '');
  private readonly apiErrorSubject = new BehaviorSubject<string | null>(null);
  readonly apiError$ = this.apiErrorSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  get<T>(path: string, _reportErrors = true): Observable<T> {
    return this.request(this.http.get<T>(this.url(path), { withCredentials: true }), _reportErrors);
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.request(this.http.post<T>(this.url(path), body, { withCredentials: true }));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.request(this.http.put<T>(this.url(path), body, { withCredentials: true }));
  }

  delete<T = void>(path: string): Observable<T> {
    return this.request(this.http.delete<T>(this.url(path), { withCredentials: true }));
  }

  imageUrl(path: string | null | undefined): string | null {
    if (!path) {
      return null;
    }
    return /^https?:\/\//i.test(path) ? path : `${this.origin}/${path.replace(/^\/+/, '')}`;
  }

  message(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con la API. Verifica que el backend esté ejecutándose en http://localhost:8080.';
      }

      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }

      if (typeof error.error?.message === 'string' && error.error.message.trim()) {
        return error.error.message;
      }

      if (error.status === 401) {
        return 'La sesión expiró o no has iniciado sesión.';
      }

      return `Error de la API (${error.status}): ${error.message}`;
    }

    return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
  }

  private url(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\/+/, '')}`;
  }

  private request<T>(request: Observable<T>, reportErrors = true): Observable<T> {
    return request.pipe(
      tap(() => this.apiErrorSubject.next(null)),
      catchError(error => {
        if (reportErrors) {
          this.apiErrorSubject.next(this.message(error));
        }
        return throwError(() => error);
      })
    );
  }
}
