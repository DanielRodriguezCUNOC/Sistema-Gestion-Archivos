import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { RequestWithUser } from '../auth/utils/RequestWithUser.js';
import { DateRangeReportDto } from './dto/date-range-report.dto.js';
import { TopActiveFilesDto } from './dto/top-active-files.dto.js';
import { TopUsersFilesDto } from './dto/top-userss-files.dto.js';
import { TopSharedUsersDto } from './dto/top-shared-users.dto.js';
import { TopSharedFilesDto } from './dto/top-shared-files.dto.js';
import { UserSharedResourcesDto } from './dto/user-shared-resources.dto.js';
import { UserActivityReportDto } from './dto/user-activity-report.dto.js';
import { UserReceivedResourcesDto } from './dto/user-received-resources.dto.js';
import { OperationsSummaryDto } from './dto/operations-summary.dto.js';
import { OperationsByPeriodDto } from './dto/operations-by-period.dto.js';


@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Get('files-by-type')
  async getFilesGroupedByType(
    @Req() req: RequestWithUser,
    @Query('userId') targetUserId?: string,
  ) {
    const currentUserRole = req.user.role;
    const currentUserId = req.user.sub || req.user.id;

    const userIdToReport =
      currentUserRole === 'ADMIN' ? targetUserId : currentUserId;

    return this.reportsService.getFilesGroupedByType(userIdToReport);
  }

  @Get('files-by-date')
  async getFilesByDateRange(
    @Req() req: RequestWithUser,
    @Query() dto: DateRangeReportDto,
  ) {
    const currentUserRole = req.user.role;
    const currentUserId = req.user.sub || req.user.id;

    const userIdToReport =
      currentUserRole === 'ADMIN' ? dto.userId : currentUserId;

    return this.reportsService.getFilesByDateRange(
      dto.startDate,
      dto.endDate,
      userIdToReport,
    );
  }

  @Get('top-active-files')
  async getTopActiveFiles(
    @Req() req: RequestWithUser,
    @Query() dto: TopActiveFilesDto,
  ) {
    const currentUserRole = req.user.role;
    const currentUserId = req.user.sub || req.user.id;

    const userIdToReport =
      currentUserRole === 'ADMIN' ? dto.userId : currentUserId;

    return this.reportsService.getTopActiveFiles(dto.limit, userIdToReport);
  }

  @Get('top-users-files')
  async getTopUsersByFileCount(
    @Req() req: RequestWithUser,
    @Query() dto: TopUsersFilesDto,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('No tienes permiso para acceder a este recurso');
    }

    return this.reportsService.getTopUsersByFileCount(dto.limit);
  }

  @Get('top-shared-users')
  async getTopUsersBySharedResources(
    @Req() req: RequestWithUser,
    @Query() dto: TopSharedUsersDto,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('No tienes permiso para acceder a este recurso');
    }

    return this.reportsService.getTopUsersBySharedResources(dto.limit);
  }

  @Get('top-shared-files')
  async getTopSharedFiles(
    @Req() req: RequestWithUser,
    @Query() dto: TopSharedFilesDto,
  ) {
    const currentUserRole = req.user.role;
    const currentUserId = req.user.sub || req.user.id;

    const userIdToReport =
      currentUserRole === 'ADMIN' ? dto.userId : currentUserId;

    return this.reportsService.getTopSharedFiles(dto.limit, userIdToReport);
  }

  @Get('user-shared-resources')
  async getSharedResourcesByUser(
    @Req() req: RequestWithUser,
    @Query() dto: UserSharedResourcesDto,
  ) {
    const currentUserRole = req.user.role;
    const currentUserId = req.user.sub || req.user.id;

    if (currentUserRole !== 'ADMIN' && dto.userId !== currentUserId) {
      throw new ForbiddenException(
        'No tienes permisos para ver los recursos compartidos por otros usuarios',
      );
    }

    return this.reportsService.getSharedResourcesByUser(dto.userId);
  }

  @Get('user-activity')
  async getUserActivityByDateRange(
    @Req() req: RequestWithUser,
    @Query() dto: UserActivityReportDto,
  ) {
    const currentUserRole = req.user.role;
    const currentUserId = req.user.sub || req.user.id;

    if (currentUserRole !== 'ADMIN' && dto.userId !== currentUserId) {
      throw new ForbiddenException(
        'No tienes permisos para ver el historial de actividad de otros usuarios',
      );
    }

    return this.reportsService.getUserActivityByDateRange(
      dto.userId,
      dto.startDate,
      dto.endDate,
    );
  }

  @Get('user-received-resources')
  async getReceivedResourcesByUser(
    @Req() req: RequestWithUser,
    @Query() dto: UserReceivedResourcesDto,
  ) {
    const currentUserRole = req.user.role;
    const currentUserId = req.user.sub || req.user.id;

    if (currentUserRole !== 'ADMIN' && dto.userId !== currentUserId) {
      throw new ForbiddenException(
        'No tienes permisos para ver los recursos recibidos por otros usuarios',
      );
    }

    return this.reportsService.getReceivedResourcesByUser(dto.userId);
  }

  @Get('operations-summary')
  async getOperationsSummary(
    @Req() req: RequestWithUser,
    @Query() dto: OperationsSummaryDto,
  ) {
    const currentUserRole = req.user.role;

    if (currentUserRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden consultar el resumen global de operaciones',
      );
    }

    return this.reportsService.getOperationsSummary(dto.startDate, dto.endDate);
  }

  @Get('operations-by-period')
  async getOperationsByPeriod(
    @Req() req: RequestWithUser,
    @Query() dto: OperationsByPeriodDto,
  ) {
    const currentUserRole = req.user.role;

    if (currentUserRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden consultar las métricas de operaciones por período',
      );
    }

    return this.reportsService.getOperationsByPeriod(
      dto.period,
      dto.startDate,
      dto.endDate,
    );
  }
}