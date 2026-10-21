import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { UsersService } from "./users.service.js";
import type { RequestWithUser } from "../auth/utils/RequestWithUser.js";

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('search')
  async searchUser(
    @Query('q') query: string,
    @Req() req: RequestWithUser
  ) {
    const currentUserId = req.user.sub || req.user.id
    return this.usersService.searchUsersForSharing(query, currentUserId)
  }
}