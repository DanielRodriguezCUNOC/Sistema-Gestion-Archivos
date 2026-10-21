import { Controller, Post, Get, Delete, Body, Query, Param, Req, Patch } from '@nestjs/common';
import { FoldersService } from './folders.service.js';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import type { RequestWithUser } from '../auth/utils/RequestWithUser.js';
import { ShareFolderDto } from './dto/share-folder/dto.js';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) { }

  @Post()
  async createFolder(
    @Body('name') createFolderDto: CreateFolderDto,
    @Req() req: RequestWithUser,
  ) {
    const ownerId = req.user.sub || req.user.id
    return this.foldersService.createFolder(createFolderDto, ownerId);
  }

  @Get('trash')
  async getTrashedFolders(@Req() req: RequestWithUser) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.getTrashedFolders(ownerId);
  }

  @Patch('trash/:id/restore')
  async restoreFolder(@Param('id') id: string, @Req() req: RequestWithUser) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.restoreFolder(id, ownerId);
  }

  @Delete('trash/:id/hard')
  async hardDeleteFolder(@Param('id') id: string, @Req() req: RequestWithUser) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.hardDeleteFolder(id, ownerId);
  }

  @Delete(':id')
  async deleteFolder(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const ownerId = req.user.sub || req.user.id
    return this.foldersService.deleteFolder(id, ownerId);
  }

  @Get('content')
  async getFolderContent(
    @Req() req: RequestWithUser,
    @Query('folderId') folderId?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy: string = 'name',
    @Query('order') order: 'asc' | 'desc' = 'asc',
  ) {
    const ownerId = req.user.sub || req.user.id
    return this.foldersService.getFolderContents(
      ownerId, folderId, search, sortBy, order);
  }

  @Post(':id/share')
  async shareFolder(
    @Param('id') id: string,
    @Body() shareFolderDto: ShareFolderDto,
    @Req() req: RequestWithUser
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.shareFolder(
      id, ownerId, shareFolderDto.targetUserId, shareFolderDto.permission
    )
  }

  @Delete(':id/share/:userId')
  async revokeShare(
    @Param('id') folderId: string,
    @Param('userId') targetUserId: string,
    @Req() req: RequestWithUser
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.revokeShareFolder(folderId, ownerId, targetUserId);
  }
}