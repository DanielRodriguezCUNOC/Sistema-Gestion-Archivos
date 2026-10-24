import { Controller, Post, Get, Delete, Body, Query, Param, Req, Patch } from '@nestjs/common';
import { FoldersService } from './folders.service.js';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import type { RequestWithUser } from '../auth/utils/RequestWithUser.js';
import { ShareFolderDto } from './dto/share-folder/dto.js';
import { RenameFolderDto } from './dto/rename-folder.dto.js';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';

@UseGuards(JwtAuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) { }

  @Post()
  async createFolder(
    @Body() createFolderDto: CreateFolderDto,
    @Req() req: RequestWithUser,
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.createFolder(createFolderDto, ownerId);
  }

  @Get('trash')
  async getTrashedFolders(@Req() req: RequestWithUser) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.getTrashedFolders(ownerId);
  }

  @Patch('trash/:id/restore')
  async restoreFolder(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.restoreFolder(id, ownerId);
  }

  @Delete('trash/:id/hard')
  async hardDeleteFolder(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.hardDeleteFolder(id, ownerId);
  }

  @Delete(':id')
  async deleteFolder(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.deleteFolder(id, ownerId);
  }

  @Patch(':id/rename')
  async renameFolder(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() renameFolderDto: RenameFolderDto,
    @Req() req: RequestWithUser,
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.renameFolder(id, ownerId, renameFolderDto.name);
  }

  @Get('content')
  async getFolderContent(
    @Req() req: RequestWithUser,
    @Query('folderId') folderId?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy: string = 'name',
    @Query('order') order: 'asc' | 'desc' = 'asc',
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.getFolderContents(
      ownerId, folderId, search, sortBy, order);
  }

  @Get(':id/content')
  async getFolderContentById(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('sortBy') sortBy: string = 'name',
    @Query('order') order: 'asc' | 'desc' = 'asc',
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.getFolderContents(
      ownerId, id, search, sortBy, order);
  }

  @Post(':id/share')
  async shareFolder(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() shareFolderDto: ShareFolderDto,
    @Req() req: RequestWithUser
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.shareFolder(
      id, ownerId, shareFolderDto.targetUserId, shareFolderDto.permission
    );
  }

  @Delete(':id/share/:userId')
  async revokeShare(
    @Param('id', ParseObjectIdPipe) folderId: string,
    @Param('userId', ParseObjectIdPipe) targetUserId: string,
    @Req() req: RequestWithUser
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.foldersService.revokeShareFolder(folderId, ownerId, targetUserId);
  }
}