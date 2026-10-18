import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Folder } from './schemas/folder.schema.js';

@Injectable()
export class FoldersService {
  constructor(
    @InjectModel(Folder.name) private readonly folderModel: Model<Folder>,
  ) { }

  async createFolder(name: string, ownerId: string, parentFolderId?: string) {
    const newFolder = new this.folderModel({
      name,
      owner: new Types.ObjectId(ownerId),
      parentFolderId: parentFolderId ? new Types.ObjectId(parentFolderId) : null,
    });
    return newFolder.save();
  }

  async getFoldersByParent(ownerId: string, parentFolderId?: string) {
    const targetParent = parentFolderId ? new Types.ObjectId(parentFolderId) : null;
    return this.folderModel.find({
      owner: new Types.ObjectId(ownerId),
      parentFolderId: targetParent,
    }).exec();
  }

  async deleteFolder(folderId: string) {
    const result = await this.folderModel.findByIdAndDelete(folderId);
    if (!result) {
      throw new NotFoundException('Carpeta no encontrada');
    }
    return { message: 'Carpeta eliminada con éxito' };
  }
}