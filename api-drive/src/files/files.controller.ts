import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  Req,
  Query,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { FilesService } from './files.service.js';
import type { RequestWithUser } from '../auth/utils/RequestWithUser.js';
import { RenameFileDto } from './dto/rename-file.dto.js';
import { MoveFileDto } from './dto/move-file.dto.js';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) { }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, //* Límite de 50MB
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
    @Body('folderId') folderId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }
    const ownerId = req.user.sub || req.user.id
    return this.filesService.uploadFile(file, ownerId, folderId);
  }

  @Get('search')
  async searchFiles(
    @Query('name') name: string,
    @Req() req: RequestWithUser,
  ) {
    const ownerId = req.user.sub || req.user.id
    return this.filesService.listFilesByFolder(ownerId, undefined, name);

  }

  @Get('view/:id')
  async viewFile(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const ownerId = req.user.sub || req.user.id
    const { fileInfo, downloadStream } = await this.filesService.getFileStream(id, ownerId);
    const encodedFilename = encodeURIComponent(fileInfo.filename);

    res.set({
      'Content-Type': fileInfo.metadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': fileInfo.length,
    })

    downloadStream.pipe(res);
  }

  @Get('download/:id')
  async downloadFile(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const ownerId = req.user.sub || req.user.id
    const { fileInfo, downloadStream } = await this.filesService.getFileStream(id, ownerId);

    const encodedFilename = encodeURIComponent(fileInfo.filename);

    res.set({
      'Content-Type': fileInfo.metadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': fileInfo.length,
    });

    downloadStream.pipe(res);
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string, @Req() req: RequestWithUser) {
    const ownerId = req.user.sub || req.user.id
    return this.filesService.deleteFile(id, ownerId);
  }

  //* Renonmbrar archivo
  @Patch(':id/rename')
  async renameFile(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() renameFileDto: RenameFileDto
  ) {
    const ownerId = req.user.sub || req.user.id
    return this.filesService.renameFile(id, ownerId, renameFileDto.filename);
  }

  //* Mover archivo a otra carpeta
  @Patch(':id/move')
  async moveFile(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() moveFileDto: MoveFileDto
  ) {
    const ownerId = req.user.sub || req.user.id
    return this.filesService.moveFile(id, ownerId, moveFileDto.targetFolderId);
  }

}