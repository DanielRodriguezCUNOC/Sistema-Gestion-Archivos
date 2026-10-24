import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcrypt';
import { User } from "../users/schemas/user.schema.js";
import { Model } from "mongoose";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/regiter.dto.js";
import { UsersService } from "../users/users.service.js";
import { UserRole } from "../users/utils/user-role.enum.js";
import { ActivityLogService } from "../activity-log/activity-log.service.js";
import { ActivityAction } from "../activity-log/utils/activity-action.enum.js";

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly activityLogService: ActivityLogService,
  ) { }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    //* Buscar usuario por email
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    //* Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await this.logAuthEvent(user, ActivityAction.LOGIN_FAILED, { reason: 'invalid_password' });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.isActive === false) {
      await this.logAuthEvent(user, ActivityAction.LOGIN_FAILED, { reason: 'account_disabled' });
      throw new ForbiddenException('Tu cuenta ha sido desactivada. Por favor, contacta al administrador para más información.');
    }


    //* Crear payload para el token JWT
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    }

    await this.logAuthEvent(user, ActivityAction.LOGIN);

    //* Retornar token JWT
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user._id,
        name: (user as any).name,
        email: user.email,
        role: user.role,
      }
    }
  }

  async logout(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (user) {
      await this.logAuthEvent(user, ActivityAction.LOGOUT);
    }
    return { message: 'Cierre de sesión exitoso' };
  }

  async registerPublicUser(registerDto: RegisterDto) {
    return this.usersService.createUser(registerDto, UserRole.USER);
  }

  private logAuthEvent(user: User, action: ActivityAction, details: Record<string, any> = {}) {
    const userId = user._id.toString();
    return this.activityLogService.tryLogEvent(userId, action, userId, 'USER', user.name, { email: user.email, ...details });
  }

}