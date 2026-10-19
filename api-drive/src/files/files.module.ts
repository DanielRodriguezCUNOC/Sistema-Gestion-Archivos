import { Module } from '@nestjs/common';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule { }