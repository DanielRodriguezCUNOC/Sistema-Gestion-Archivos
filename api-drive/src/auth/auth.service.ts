import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcrypt';
import { User } from "./schemas/user.schema.js";
import { Model } from "mongoose";
import { LoginDto } from "./dto/login.dto.js";

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
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
      throw new UnauthorizedException('Credenciales inválidas');
    }

    //* Crear payload para el token JWT
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    }

    //* Retornar token JWT
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      }
    }
  }


}