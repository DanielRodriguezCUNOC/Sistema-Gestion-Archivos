import { Controller, HttpCode, Post, Body, HttpStatus, UseGuards, Req } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { RegisterDto } from "./dto/regiter.dto.js";
import type { RequestWithUser } from "./utils/RequestWithUser.js";

@Controller('auth')
export class AuthController {

  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: RequestWithUser) {
    return this.authService.logout(req.user.sub || req.user.id);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.registerPublicUser(registerDto);
  }

}