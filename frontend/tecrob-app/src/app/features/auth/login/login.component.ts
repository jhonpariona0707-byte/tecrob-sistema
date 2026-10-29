import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  email: string = '';
  password: string = '';
  error: string = '';
  cargando: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.error = '';

    if (!this.email || !this.password) {
      this.error = 'Por favor, completa todos los campos';
      return;
    }

    this.cargando = true;

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        // Login exitoso, redirigir al dashboard
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.error = '❌ Correo o contraseña incorrectos';
        this.cargando = false;
      }
    });
  }
}