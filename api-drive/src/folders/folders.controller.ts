import { Controller, Post, Get, Delete, Body, Query, Param, Req } from '@nestjs/common';
import { FoldersService } from './folders.service.js';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import * as RequestWithUser from '../auth/utils/RequestWithUser.js';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) { }

  @Post()
  async createFolder(
    @Body('name') createFolderDto: CreateFolderDto,
    @Req() req: RequestWithUser.RequestWithUser,
  ) {
    const ownerId = req.user.sub || req.user.id
    return this.foldersService.createFolder(createFolderDto, ownerId);
  }

  @Delete(':id')
  async deleteFolder(@Param('id') id: string) {
    return this.foldersService.deleteFolder(id);
  }

  @Get('content')
  async getFolderContent(
    @Req() req: RequestWithUser.RequestWithUser,
    @Query('folderId') folderId?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy: string = 'name',
    @Query('order') order: 'asc' | 'desc' = 'asc',
  ) {
    const ownerId = req.user.sub || req.user.id
    return this.foldersService.getFolderContents(
      ownerId, folderId, search, sortBy, order);
  }
}