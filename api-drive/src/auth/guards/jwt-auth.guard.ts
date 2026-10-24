import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { RequestWithUser } from "../utils/RequestWithUser.js";
import { UsersService } from "../../users/users.service.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticación no proporcionado');
    }

    let payload: any;

    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch (error: any) {
      throw new UnauthorizedException(`Fallo al verificar token: ${error.message}`);
    }

    const isActive = await this.usersService.isUserActive(payload.sub);
    if (!isActive) {
      throw new UnauthorizedException('La cuenta ha sido desactivada.');
    }

    request['user'] = { ...payload, id: payload.sub };
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}