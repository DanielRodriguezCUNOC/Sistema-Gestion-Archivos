import { UserRole } from "../enums/user-role.enu";

export interface RegisterDto {
  name: string;
  email: string;
  password?: string;
  role?: UserRole;
}