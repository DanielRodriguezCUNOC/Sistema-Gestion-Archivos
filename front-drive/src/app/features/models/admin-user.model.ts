import { UserRole } from '../../core/enums/user-role.enu';

export type UserStatusFilter = 'all' | 'active' | 'inactive';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  createdAt?: string;
  isCurrentUser: boolean;
}

export interface AdminUserListQuery {
  search: string;
  status: UserStatusFilter;
  page: number;
  limit: number;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateAdminUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}
