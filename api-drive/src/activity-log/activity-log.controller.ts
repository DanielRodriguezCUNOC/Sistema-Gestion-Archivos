import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { RequestWithUser } from '../auth/utils/RequestWithUser.js';

@UseGuards(JwtAuthGuard)
@Controller('activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) { }

  @Get()
  async getLogs(
    @Req() req: RequestWithUser,
    @Query('resourceId') resourceId?: string,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.activityLogService.getLogs(userId, resourceId);
  }
}