import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { FoldersModule } from './folders/folders.module.js';
import { FilesModule } from './files/files.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { SharesModule } from './shares/shares.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { ActivityLogModule } from './activity-log/activity-log.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    FoldersModule,
    FilesModule,
    AuthModule,
    UsersModule,
    SharesModule,
    ReportsModule,
    ActivityLogModule,
  ],
})
export class AppModule { }