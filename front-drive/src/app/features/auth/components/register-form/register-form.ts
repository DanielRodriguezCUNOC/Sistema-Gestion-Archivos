import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { UserRole } from '../../../../core/enums/user-role.enu';
import { RegisterDto } from '../../../../core/models/register.dto';

@Component({
  selector: 'app-register-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-form.html',
  styleUrl: './register-form.css',
})
export class RegisterForm {

  private readonly fb = inject(FormBuilder)
  private readonly authService = inject(AuthService)

  //* Exponer el enum al HTML
  readonly UserRole = UserRole

  //* Evalua si el usuario es un administrador
  readonly isAdmin = this.authService.isAdmin

  //* Estados locales usando signals
  readonly isLoading = signal(false)
  readonly errorMessage = signal<string | null>(null)

  //* Evento al completar el registro
  readonly userCreated = output<void>()

  readonly registerForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: [UserRole.USER],
  })

  isFieldInvalid(field: string): boolean {
    const control = this.registerForm.get(field)
    return !!(control && control.invalid && (control.dirty || control.touched))
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched()
      return
    }

    this.isLoading.set(true)
    this.errorMessage.set(null)

    //* Extraer los datos del formulario con sus tipos correctos
    const rawForm = this.registerForm.getRawValue()

    //* Evalua si isAdmin es Signal o es una propiedad simple
    const isUserAdmin = typeof this.isAdmin === 'function' ? this.isAdmin() : this.isAdmin;

    if (isUserAdmin) {
      //* flujo para crear un usuario desde el admin
      const dto: RegisterDto = {
        name: rawForm.name,
        email: rawForm.email,
        password: rawForm.password,
        role: rawForm.role as UserRole
      }

      this.authService.adminCreateUser(dto).subscribe({
        next: () => {
          this.isLoading.set(false)
          this.registerForm.reset({ role: UserRole.USER })
          this.userCreated.emit()
        },
        error: (error) => {
          this.isLoading.set(false)
          this.errorMessage.set(error.message || 'Error al crear el usuario')
        }
      })
    } else {
      //* flujo para registro público
      const dto: RegisterDto = {
        name: rawForm.name,
        email: rawForm.email,
        password: rawForm.password,
      }
      this.authService.registerPublic(dto).subscribe({
        next: () => {
          this.isLoading.set(false)
          this.userCreated.emit()
        },
        error: (error) => {
          this.isLoading.set(false)
          this.errorMessage.set(error.message || 'Error al completar el registro')
        }

      })
    }
  }


}
