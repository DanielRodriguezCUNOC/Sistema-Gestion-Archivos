import { Component, inject } from '@angular/core';
import { AuthService } from '../../../app/features/auth/auth.service';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {

  private readonly authService = inject(AuthService);

  readonly isAdmin = this.authService.isAdmin;
}
