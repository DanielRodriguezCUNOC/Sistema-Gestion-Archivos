import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { UsersService } from "./users.service.js";
import type { RequestWithUser } from "../auth/utils/RequestWithUser.js";
import { RegisterDto } from "../auth/dto/regiter.dto.js";

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  async adminCreateUser(@Body() registerDto: RegisterDto) {
    return this.usersService.createUser(registerDto)
  }

  @Get('search')
  async searchUser(
    @Query('q') query: string,
    @Req() req: RequestWithUser
  ) {
    const currentUserId = req.user.sub || req.user.id
    return this.usersService.searchUsersForSharing(query, currentUserId)
  }
}