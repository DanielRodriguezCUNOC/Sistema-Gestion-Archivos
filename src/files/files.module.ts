import { Module } from '@nestjs/common';
import { FilesService } from './files.service.js';
import { FilesController } from './files.controller.js';

@Module({
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
