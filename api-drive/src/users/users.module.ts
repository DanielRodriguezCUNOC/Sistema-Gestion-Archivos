import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { User, UserSchema } from './schemas/user.schema.js';
import { ActivityLog, ActivityLogSchema } from '../activity-log/schemas/activity-log.schema.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';

@Global()
@Module({
  imports: [
    JwtModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, ActivityLogService],
  exports: [UsersService],
})
export class UsersModule { }
