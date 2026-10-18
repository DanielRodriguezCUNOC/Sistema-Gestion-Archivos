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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { FilesService } from './files.service.js';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) { }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('ownerId') ownerId: string,
    @Body('folderId') folderId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }
    return this.filesService.uploadFile(file, ownerId, folderId);
  }

  @Get('download/:id')
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const { fileInfo, downloadStream } = await this.filesService.getFileStream(id);

    res.set({
      'Content-Type': fileInfo.metadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileInfo.filename}"`,
    });

    downloadStream.pipe(res);
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string) {
    await this.filesService.deleteFile(id);
    return { message: 'Archivo eliminado correctamente de MongoDB' };
  }
}