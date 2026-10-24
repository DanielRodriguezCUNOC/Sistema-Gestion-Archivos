import { Module } from '@nestjs/common';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLog, ActivityLogSchema } from '../activity-log/schemas/activity-log.schema.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';

@Module({
  imports: [
    JwtModule,
    MongooseModule.forFeature([{ name: ActivityLog.name, schema: ActivityLogSchema }]),
  ],
  controllers: [FilesController],
  providers: [FilesService, ActivityLogService],
  exports: [FilesService],
})
export class FilesModule { }