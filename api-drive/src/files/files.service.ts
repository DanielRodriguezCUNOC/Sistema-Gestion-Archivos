import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Types } from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import 'multer';

@Injectable()
export class FilesService implements OnModuleInit {
  private gridFSBucket!: GridFSBucket;

  constructor(@InjectConnection() private readonly connection: Connection) { }

  onModuleInit() {
    if (!this.connection.db) {
      throw new Error('La conexión con la base de datos MongoDB no está lista.');
    }
    this.gridFSBucket = new GridFSBucket(this.connection.db, {
      bucketName: 'uploads',
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    ownerId: string,
    folderId?: string,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);

      const targetFolderObjectId = folderId && Types.ObjectId.isValid(folderId)
        ? new Types.ObjectId(folderId) : null;

      const uploadStream = this.gridFSBucket.openUploadStream(file.originalname, {
        metadata: {
          contentType: file.mimetype,
          owner: new Types.ObjectId(ownerId),
          folderId: targetFolderObjectId,
          size: file.size,
        },
      });

      readableStream
        .pipe(uploadStream)
        .on('error', (error) => reject(error))
        .on('finish', () => {
          resolve({
            id: uploadStream.id,
            filename: file.originalname,
            length: file.size,
            contentType: file.mimetype,
            folderId: folderId || null,
            uploadDate: new Date(),
          });
        });
    });
  }

  async getFileStream(fileId: string, ownerId: string) {

    if (!Types.ObjectId.isValid(fileId)) {
      throw new NotFoundException('Archivo no encontrado en la base de datos');
    }

    const _id = new Types.ObjectId(fileId);
    const files = await this.gridFSBucket.find({
      _id,
      'metadata.owner': new Types.ObjectId(ownerId),
    }).toArray();

    if (!files || files.length === 0) {
      throw new NotFoundException('Archivo no encontrado o no tienes permiso para acceder a él');
    }

    const fileInfo = files[0];
    const downloadStream = this.gridFSBucket.openDownloadStream(_id);

    return { fileInfo, downloadStream };
  }

  async deleteFile(fileId: string): Promise<void> {
    const _id = new Types.ObjectId(fileId);
    await this.gridFSBucket.delete(_id);
  }

  async listFilesByFolder(
    ownerId: string,
    folderId?: string,
    search?: string,
    sortBy: string = 'name',
    order: 'asc' | 'desc' = 'asc',
  ) {
    const query: Record<string, any> = {
      'metadata.owner': new Types.ObjectId(ownerId),
    }

    //* Si hay término de búsqueda, se agrega a la consulta
    if (search && search.trim() !== '') {
      query.filename = { $regex: search.trim(), $options: 'i' }
    } else {
      //* si no hay busqueda, trae la carpeta solicitada
      query['metadata.folderId'] = folderId ? new Types.ObjectId(folderId) : null
    }

    //* Criterios de ordenamiento
    let sortField = 'filename'
    if (sortBy === 'date') sortField = 'uploadDate'
    if (sortBy === 'size') sortField = 'length'

    const sortOrder = order === 'desc' ? -1 : 1

    const files = await this.gridFSBucket.find(query).sort({ [sortField]: sortOrder }).toArray()

    return files.map((file) => ({
      id: file._id,
      filename: file.filename,
      length: file.length,
      uploadDate: file.uploadDate,
      contentType: file.metadata?.contentType,
      folderId: file.metadata?.folderId || null,
    }))
  }
}