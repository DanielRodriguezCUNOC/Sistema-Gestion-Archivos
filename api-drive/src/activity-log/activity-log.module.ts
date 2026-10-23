import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ActivityLogController } from './activity-log.controller.js';
import { ActivityLogService } from './activity-log.service.js';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema.js';

@Module({
  imports: [
    JwtModule,
    MongooseModule.forFeature([{ name: ActivityLog.name, schema: ActivityLogSchema }]),
  ],
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule { }
