import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Folder } from '../folders/schemas/folder.schema.js';

@Injectable()
export class SharesService {
  constructor(
    @InjectModel(Folder.name) private folderModel: Model<Folder>,
    @InjectConnection() private readonly connection: Connection,
  ) { }

  async getSharedWithMe(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    //* Buscar carpetas compartidas con el usuario que no estén en la papelera
    const foldersPromise = this.folderModel.find({
      'sharedWith.userId': userObjectId,
      isTrash: false,
    })
      .populate('owner', 'name email avatar')
      .exec();

    //* Buscar archivos compartidos con el usuario
    const filesPromise = this.connection.db!
      .collection('uploads.files')
      .find({
        'metadata.sharedWith.userId': userObjectId,
        'metadata.isTrash': false,
      })
      .toArray();

    //* Ejecutar ambas promesas en paralelo
    const [folders, files] = await Promise.all([foldersPromise, filesPromise]);

    const formattedFiles = files.map((file) => ({
      _id: file._id,
      filename: file.filename,
      length: file.length,
      uploadDate: file.uploadDate,
      contentType: file.metadata?.contentType,
      owner: file.metadata?.owner,
      sharedWith: file.metadata?.sharedWith,
    }));

    return {
      folders,
      files: formattedFiles,
    };
  }
}