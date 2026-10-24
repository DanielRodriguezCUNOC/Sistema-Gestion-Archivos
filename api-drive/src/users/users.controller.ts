import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { UsersService } from "./users.service.js";
import type { RequestWithUser } from "../auth/utils/RequestWithUser.js";
import { RegisterDto } from "../auth/dto/regiter.dto.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { Role } from "../auth/enums/role.enum.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { ParseObjectIdPipe } from "../common/pipes/parse-object-id.pipe.js";
import { ListUsersQueryDto } from "./dto/list-users-query.dto.js";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto.js";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  //* Crear usuario solo para administradores
  @Post()
  @Roles(Role.ADMIN)
  async adminCreateUser(@Body() registerDto: RegisterDto, @Req() req: RequestWithUser) {
    const currentUserId = req.user.sub || req.user.id
    return this.usersService.createUser(registerDto, undefined, currentUserId)
  }

  //* Listado paginado con búsqueda y filtro de estado, solo para admin
  @Get('admin')
  @Roles(Role.ADMIN)
  async listUsers(@Query() query: ListUsersQueryDto, @Req() req: RequestWithUser) {
    const currentUserId = req.user.sub || req.user.id
    return this.usersService.listUsers(query, currentUserId)
  }

  //* Activar / desactivar usuario solo admin
  @Patch('admin/:id/status')
  @Roles(Role.ADMIN)
  async updateUserStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: RequestWithUser,
  ) {
    const currentUserId = req.user.sub || req.user.id
    return this.usersService.setUserStatus(id, dto.isActive, currentUserId)
  }

  @Get('search')
  async searchUser(
    @Query('q') query: string,
    @Req() req: RequestWithUser
  ) {
    const currentUserId = req.user.sub || req.user.id
    return this.usersService.searchUsersForSharing(query, currentUserId)
  }

  @Get('admin/search')
  @Roles(Role.ADMIN)
  async searchUsersForReports(@Query('q') query: string,) {
    return this.usersService.searchUsersForReports(query)
  }
}
