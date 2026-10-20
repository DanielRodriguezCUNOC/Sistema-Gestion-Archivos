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

  async deleteFile(fileId: string, ownerId: string): Promise<{ message: string }> {

    if (!Types.ObjectId.isValid(fileId)) {
      throw new NotFoundException('Archivo no encontrado en la base de datos');
    }

    const _id = new Types.ObjectId(fileId);
    const ownerObjectId = new Types.ObjectId(ownerId);

    //* Verificar si el archivo existe y le pertenece al usuario
    const files = await this.gridFSBucket.find({ _id, 'metadata.owner': ownerObjectId }).toArray()

    if (!files || files.length === 0) {
      throw new NotFoundException('Archivo no encontrado o no tienes permiso para acceder a él');
    }

    /* 
      * Eliminar el archivo de GridFS 
      * Se boora de uploads.files y uploads.chunks
      * uploads.chunks contiene los datos binarios del archivo, mientras que uploads.files contiene la metadata del archivo.
    */
    await this.gridFSBucket.delete(_id);

    return { message: 'Archivo eliminado correctamente de la base de datos' };
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

  //* Obtener metadata y contenido de un archivo para descarga o visualización
  async getFileStream(fileId: string, ownerId: string) {
    if (!Types.ObjectId.isValid(fileId)) {
      throw new NotFoundException('Archivo no encontrado en la base de datos');
    }

    const _id = new Types.ObjectId(fileId);
    const files = await this.gridFSBucket.find({
      _id, 'metadata.owner': new Types.ObjectId(ownerId),
    }).toArray();

    if (!files || files.length === 0) {
      throw new NotFoundException('Archivo no encontrado o no tienes permiso para acceder a él');
    }

    const fileInfo = files[0];
    const downloadStream = this.gridFSBucket.openDownloadStream(_id);

    return { fileInfo, downloadStream };
  }

  //* Renombrar archivo
  async renameFile(fileId: string, ownerId: string, newName: string) {
    if (!Types.ObjectId.isValid(fileId)) {
      throw new NotFoundException('Archivo no encontrado en la base de datos');
    }

    const _id = new Types.ObjectId(fileId)

    //* verificar si el archivo existe y le pertenece al usuario
    const files = await this.gridFSBucket.find({
      _id, 'metadata.owner': new Types.ObjectId(ownerId),
    }).toArray()

    if (!files || files.length === 0) {
      throw new NotFoundException('Archivo no encontrado o no tienes permiso para acceder a él');
    }

    const trimmedName = newName.trim()

    //* Funcion nativa de GridFS para renombrar el archivo
    await this.gridFSBucket.rename(_id, trimmedName)

    return {
      id: fileId,
      filename: trimmedName,
      message: 'Archivo renombrado correctamente',
    }
  }

  async moveFile(
    fileId: string,
    ownerId: string,
    targetFolderId?: string | null
  ) {
    if (!Types.ObjectId.isValid(fileId)) {
      throw new NotFoundException('Archivo no encontrado en la base de datos');
    }
    const fileObjectId = new Types.ObjectId(fileId);
    const ownerObjectId = new Types.ObjectId(ownerId);

    //* verificar que el archivo existe y le pertenece al usuario
    const file = await this.connection.db?.collection('uploads.files')
      .findOne({ _id: fileObjectId, 'metadata.owner': ownerObjectId });

    if (!file) {
      throw new NotFoundException('Archivo no encontrado o no tienes permiso para acceder a él');
    }

    //* Carpeta destino
    let destinationFolderObjectId: Types.ObjectId | null = null;
    if (targetFolderId && Types.ObjectId.isValid(targetFolderId)) {
      destinationFolderObjectId = new Types.ObjectId(targetFolderId);
    }

    //* Actualizar el metadata del archivo con la nueva carpeta destino
    await this.connection.db?.collection('uploads.files').updateOne(
      { _id: fileObjectId },
      { $set: { 'metadata.folderId': destinationFolderObjectId } }
    );

    return {
      id: fileId,
      targetFolderId: destinationFolderObjectId ? destinationFolderObjectId.toString() : null,
      message: 'Archivo movido correctamente',
    };
  }

  //* Eliminar carpeta y todos sus archivos
  async deleteFolderAndFiles(folderId: string, ownerId: string) {
    if (!Types.ObjectId.isValid(folderId)) {
      throw new NotFoundException('Carpeta no encontrada en la base de datos');
    }

    const folderObjectId = new Types.ObjectId(folderId);
    const ownerObjectId = new Types.ObjectId(ownerId);

    //* Verificar si la carpeta existe y le pertenece al usuario
    const folderExists = await this.connection.db?.collection('uploads.files')
      .findOne({ _id: folderObjectId, 'metadata.owner': ownerObjectId });

    if (!folderExists) {
      throw new NotFoundException('Carpeta no encontrada o no tienes permiso para acceder a ella');
    }

    //* Eliminar todos los archivos dentro de la carpeta
    await this.connection.db?.collection('uploads.files').deleteMany({
      'metadata.folderId': folderObjectId,
      'metadata.owner': ownerObjectId,
    });
  }

  async deleteFilesByFolderIds(folderIds: Types.ObjectId[], ownerId: string): Promise<number> {
    const ownerObjectId = new Types.ObjectId(ownerId);

    //* Buscar todos los archivos que esten dentro de la carpeta padre y esté dentro de la lista de IDs recolectados
    const files = await this.gridFSBucket.find({
      'metadata.owner': ownerObjectId,
      'metadata.folderId': { $in: folderIds },
    }).toArray()

    //* Eliminar todos los archivos encontrados de GridFS
    for (const file of files) {
      await this.gridFSBucket.delete(file._id);
    }
    return files.length;
  }
}