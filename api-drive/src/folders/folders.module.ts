import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoldersController } from './folders.controller.js';
import { FoldersService } from './folders.service.js';
import { Folder, FolderSchema } from './schemas/folder.schema.js';
import { JwtModule } from '@nestjs/jwt';
import { FilesModule } from '../files/files.module.js';
import { ActivityLog, ActivityLogSchema } from '../activity-log/schemas/activity-log.schema.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Folder.name, schema: FolderSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
    JwtModule,
    FilesModule,
  ],
  controllers: [FoldersController],
  providers: [FoldersService, ActivityLogService],
  exports: [FoldersService],
})
export class FoldersModule { }