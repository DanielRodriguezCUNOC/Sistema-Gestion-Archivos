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

      const uploadStream = this.gridFSBucket.openUploadStream(file.originalname, {
        metadata: {
          contentType: file.mimetype,
          owner: new Types.ObjectId(ownerId),
          folderId: folderId ? new Types.ObjectId(folderId) : null,
          size: file.size,
        },
      });

      readableStream
        .pipe(uploadStream)
        .on('error', (error) => reject(error))
        .on('finish', () => {
          resolve({
            fileId: uploadStream.id,
            filename: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            folderId: folderId || null,
          });
        });
    });
  }

  async getFileStream(fileId: string) {
    const _id = new Types.ObjectId(fileId);
    const files = await this.gridFSBucket.find({ _id }).toArray();

    if (!files || files.length === 0) {
      throw new NotFoundException('Archivo no encontrado en la base de datos');
    }

    const fileInfo = files[0];
    const downloadStream = this.gridFSBucket.openDownloadStream(_id);

    return { fileInfo, downloadStream };
  }

  async listFilesByFolder(ownerId: string, folderId?: string) {
    const targetFolderId = folderId ? new Types.ObjectId(folderId) : null;
    return this.gridFSBucket
      .find({
        'metadata.owner': new Types.ObjectId(ownerId),
        'metadata.folderId': targetFolderId,
      })
      .toArray();
  }

  async deleteFile(fileId: string): Promise<void> {
    const _id = new Types.ObjectId(fileId);
    await this.gridFSBucket.delete(_id);
  }
}