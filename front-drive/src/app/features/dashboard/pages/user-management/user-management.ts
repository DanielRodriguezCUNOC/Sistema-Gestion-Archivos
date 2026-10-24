import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserManagementState } from '../../services/user-management.state';
import { UserCreateModal } from '../../components/user-create-modal/user-create-modal';

@Component({
  selector: 'app-user-management',
  imports: [DatePipe, RouterLink, UserCreateModal],
  providers: [UserManagementState],
  templateUrl: './user-management.html',
})
export class UserManagement implements OnInit {
  readonly state = inject(UserManagementState);

  ngOnInit(): void {
    this.state.load();
  }
}
