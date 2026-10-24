import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { UsersModule } from '../users/users.module.js';
import { ActivityLog, ActivityLogSchema } from '../activity-log/schemas/activity-log.schema.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'dev-secret',
        signOptions: {
          expiresIn: (configService.get('JWT_EXPIRES_IN') || '24h') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, ActivityLogService],
  exports: [JwtModule],
})
export class AuthModule { }