import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { RequestWithUser } from '../auth/utils/RequestWithUser.js';
import { SharesService } from './shares.service.js';


@Controller('shares')
@UseGuards(JwtAuthGuard)
export class SharesController {
  constructor(private readonly sharesService: SharesService) { }

  @Get('shared-with-me')
  async getSharedWithMe(@Req() req: RequestWithUser) {
    return this.sharesService.getSharedWithMe(req.user.sub || req.user.id);
  }
}