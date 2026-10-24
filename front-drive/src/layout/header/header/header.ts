import { Component, inject } from '@angular/core';
import { AuthService } from '../../../app/core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {

  authService = inject(AuthService);
}
