import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { SharesController } from './shares.controller.js';
import { SharesService } from './shares.service.js';
import { Folder, FolderSchema } from '../folders/schemas/folder.schema.js';

@Module({
  imports: [
    JwtModule,
    MongooseModule.forFeature([{ name: Folder.name, schema: FolderSchema }]),
  ],
  controllers: [SharesController],
  providers: [SharesService],
  exports: [SharesService],
})
export class SharesModule { }
