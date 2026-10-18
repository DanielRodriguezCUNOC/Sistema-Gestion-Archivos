import { Controller, Post, Get, Delete, Body, Query, Param } from '@nestjs/common';
import { FoldersService } from './folders.service.js';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) { }

  @Post()
  async createFolder(
    @Body('name') name: string,
    @Body('ownerId') ownerId: string,
    @Body('parentFolderId') parentFolderId?: string,
  ) {
    return this.foldersService.createFolder(name, ownerId, parentFolderId);
  }

  @Get()
  async getFolders(
    @Query('ownerId') ownerId: string,
    @Query('parentFolderId') parentFolderId?: string,
  ) {
    return this.foldersService.getFoldersByParent(ownerId, parentFolderId);
  }

  @Delete(':id')
  async deleteFolder(@Param('id') id: string) {
    return this.foldersService.deleteFolder(id);
  }
}