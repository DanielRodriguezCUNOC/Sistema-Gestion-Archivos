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
  Put,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { FilesService } from './files.service.js';
import type { RequestWithUser } from '../auth/utils/RequestWithUser.js';
import { RenameFileDto } from './dto/rename-file.dto.js';
import { MoveFileDto } from './dto/move-file.dto.js';
import { ShareFileDto } from './dto/share-file.dto.js';
import { UpdateFileContentDto } from './dto/update-file-content.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { ActivityAction } from '../activity-log/utils/activity-action.enum.js';

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) { }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, //* Límite de 50MB
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = ['text/plain', 'text/markdown', 'text/x-markdown'];
        const isAllowedExtension = file.originalname.match(/\.(txt|md)$/i);

        if (allowedMimeTypes.includes(file.mimetype) && isAllowedExtension) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Solo se permiten archivos de texto (.txt, .md)'), false);
        }
      },
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

  @Get('trash')
  async getTrashedFiles(@Req() req: RequestWithUser) {
    const ownerId = req.user.sub || req.user.id;
    return this.filesService.getTrashedFiles(ownerId);
  }

  @Patch('trash/:id/restore')
  async restoreFile(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.filesService.restoreFile(id, ownerId);
  }

  @Delete('trash/:id/hard')
  async hardDeleteFile(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.filesService.hardDeleteFile(id, ownerId);
  }

  @Get('view/:id')
  async viewFile(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const ownerId = req.user.sub || req.user.id
    const { fileInfo, downloadStream } = await this.filesService.getFileStream(id, ownerId, ActivityAction.VIEW_FILE);
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
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const ownerId = req.user.sub || req.user.id;
    const { fileInfo, downloadStream } = await this.filesService.getFileStream(id, ownerId, ActivityAction.DOWNLOAD_FILE);

    const encodedFilename = encodeURIComponent(fileInfo.filename);

    res.set({
      'Content-Type': fileInfo.metadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': fileInfo.length,
    });

    downloadStream.pipe(res);
  }

  @Get(':id/content')
  async getEditableFileContent(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.filesService.getEditableFileContent(id, userId);
  }

  @Delete(':id')
  async deleteFile(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.filesService.deleteFile(id, ownerId);
  }

  @Patch(':id/rename')
  async renameFile(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: RequestWithUser,
    @Body() renameFileDto: RenameFileDto
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.filesService.renameFile(id, ownerId, renameFileDto.filename);
  }

  @Patch(':id/move')
  async moveFile(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: RequestWithUser,
    @Body() moveFileDto: MoveFileDto
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.filesService.moveFile(id, ownerId, moveFileDto.targetFolderId);
  }

  @Post(':id/share')
  async shareFile(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() shareFileDto: ShareFileDto,
    @Req() req: RequestWithUser
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.filesService.shareFile(id, ownerId, shareFileDto.targetUserId, shareFileDto.permission);
  }

  @Delete(':id/share/:userId')
  async revokeShare(
    @Param('id', ParseObjectIdPipe) fileId: string,
    @Param('userId', ParseObjectIdPipe) targetUserId: string,
    @Req() req: RequestWithUser
  ) {
    const ownerId = req.user.sub || req.user.id;
    return this.filesService.revokeShareFile(fileId, ownerId, targetUserId);
  }

  @Put(':id/content')
  async updateFileContent(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: RequestWithUser,
    @Body() updateDto: UpdateFileContentDto,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.filesService.updateFileContent(
      id,
      userId,
      updateDto.content,
      updateDto.version,
    );
  }

}