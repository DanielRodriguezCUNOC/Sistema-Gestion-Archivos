import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserRole } from '../../../../core/enums/user-role.enu';
import { UserManagementState } from '../../services/user-management.state';

@Component({
  selector: 'app-user-create-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './user-create-modal.html',
})
export class UserCreateModal {
  private readonly fb = inject(FormBuilder);

  readonly state = inject(UserManagementState);
  readonly UserRole = UserRole;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: this.fb.nonNullable.control<UserRole>(UserRole.USER),
  });

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.state.createUser(this.form.getRawValue());
  }
}
