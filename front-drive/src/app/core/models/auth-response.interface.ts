import { User } from "./user.interface";

export interface AuthResponse {
  accessToken: string;
  user: User;
}