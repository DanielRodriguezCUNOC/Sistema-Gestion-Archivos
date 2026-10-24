import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { Folder } from '../folders/schemas/folder.schema.js';

@Injectable()
export class SharesService {
  constructor(
    @InjectModel(Folder.name) private folderModel: Model<Folder>,
    @InjectConnection() private readonly connection: Connection,
  ) { }

  async getSharedWithMe(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const foldersPromise = this.folderModel.find({
      'sharedWith.userId': userObjectId,
      isTrash: { $ne: true },
    })
      .populate('owner', 'name email avatar')
      .exec();

    const filesPromise = this.connection.db!
      .collection('uploads.files')
      .find({
        'metadata.sharedWith.userId': userObjectId,
        'metadata.isTrash': { $ne: true },
      })
      .toArray();

    const [folders, files] = await Promise.all([foldersPromise, filesPromise]);

    const formattedFolders = folders.map((folder) => ({
      ...folder.toObject(),
      id: (folder._id as Types.ObjectId).toString(),
      _id: (folder._id as Types.ObjectId).toString(),
    }));

    const formattedFiles = files.map((file) => ({
      _id: file._id.toString(),
      id: file._id.toString(),
      filename: file.filename,
      length: file.length,
      uploadDate: file.uploadDate,
      contentType: file.metadata?.contentType,
      owner: file.metadata?.owner,
      sharedWith: file.metadata?.sharedWith,
    }));

    return {
      folders: formattedFolders,
      files: formattedFiles,
    };
  }
}