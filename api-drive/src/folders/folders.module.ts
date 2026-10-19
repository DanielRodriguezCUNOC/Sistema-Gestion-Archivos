import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoldersController } from './folders.controller.js';
import { FoldersService } from './folders.service.js';
import { Folder, FolderSchema } from './schemas/folder.schema.js';
import { JwtModule } from '@nestjs/jwt';
import { FilesModule } from '../files/files.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Folder.name, schema: FolderSchema }]),
    JwtModule,
    FilesModule,
  ],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule { }