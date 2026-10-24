import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Types } from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import 'multer';
import { PermissionLevel } from './utils/permission-level.enum.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { ActivityAction } from '../activity-log/utils/activity-action.enum.js';

@Injectable()
export class FilesService implements OnModuleInit {
  private gridFSBucket!: GridFSBucket;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly activityLogService: ActivityLogService,
  ) { }

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
        .on('finish', async () => {
          try {
            await this.activityLogService.logEvent(
              ownerId,
              ActivityAction.UPLOAD_FILE,
              uploadStream.id.toString(),
              'FILE',
              file.originalname,
            );

            resolve({
              id: uploadStream.id,
              filename: file.originalname,
              length: file.size,
              contentType: file.mimetype,
              folderId: folderId || null,
              uploadDate: new Date(),
            });
          } catch (error) {
            reject(error);
          }
        });
    });
  }

  async deleteFile(fileId: string, ownerId: string): Promise<{ message: string }> {

    if (!Types.ObjectId.isValid(fileId)) {
      throw new NotFoundException('Archivo no encontrado en la base de datos');
    }

    const fileObjectId = new Types.ObjectId(fileId);
    const ownerObjectId = new Types.ObjectId(ownerId);

    //* Verificar si el archivo existe y le pertenece al usuario
    const file = await this.connection.db?.collection('uploads.files').findOne({
      _id: fileObjectId,
      'metadata.owner': ownerObjectId
    })

    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    /* 
      * Actualizar metadatos
    */
    await this.connection.db?.collection('uploads.files').updateOne({
      _id: fileObjectId
    }, {
      $set: {
        'metadata.isTrash': true, 'metadata.deletedAt': new Date()
      }
    });

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.DELETE_FILE,
      fileId,
      'FILE',
      file.filename,
    );

    return { message: 'Archivo enviado a la papelera' };
  }

  async listFilesByFolder(
    ownerId: string,
    folderId?: string,
    search?: string,
    sortBy: string = 'name',
    order: 'asc' | 'desc' = 'asc',
  ) {
    const query: Record<string, any> = {
      'metadata.isTrash': { $ne: true },
      $or: [
        { 'metadata.owner': new Types.ObjectId(ownerId) },
        { 'metadata.sharedWith.userId': new Types.ObjectId(ownerId) },
      ],
    };

    if (search && search.trim() !== '') {
      query.filename = { $regex: search.trim(), $options: 'i' };
    } else {
      query['metadata.folderId'] = (folderId && Types.ObjectId.isValid(folderId))
        ? new Types.ObjectId(folderId)
        : { $in: [null, undefined] };
    }

    let sortField = 'filename';
    if (sortBy === 'date') sortField = 'uploadDate';
    if (sortBy === 'size') sortField = 'length';

    const sortOrder = order === 'desc' ? -1 : 1;

    const files = await this.gridFSBucket.find(query).sort({ [sortField]: sortOrder }).toArray();

    return files.map((file) => ({
      _id: file._id.toString(),
      id: file._id.toString(),
      filename: file.filename,
      length: file.length,
      uploadDate: file.uploadDate,
      contentType: file.metadata?.contentType,
      folderId: file.metadata?.folderId ? file.metadata.folderId.toString() : null,
    }));
  }

  //* Obtener metadata y contenido de un archivo para descarga o visualización
  async getFileStream(
    fileId: string,
    requesterId: string,
    action: ActivityAction.VIEW_FILE | ActivityAction.DOWNLOAD_FILE,
  ) {
    if (!Types.ObjectId.isValid(fileId)) {
      throw new NotFoundException('Archivo no encontrado en la base de datos');
    }

    const _id = new Types.ObjectId(fileId);
    const requesterObjectId = new Types.ObjectId(requesterId);
    const files = await this.gridFSBucket.find({
      _id,
      'metadata.isTrash': { $ne: true },
      $or: [
        { 'metadata.owner': requesterObjectId },
        { 'metadata.sharedWith.userId': requesterObjectId }
      ]
    }).toArray();

    if (!files || files.length === 0) {
      throw new NotFoundException('Archivo no encontrado o no tienes permiso para acceder a él');
    }

    const fileInfo = files[0];

    await this.activityLogService.tryLogEvent(
      requesterId,
      action,
      fileId,
      'FILE',
      fileInfo.filename,
      { ownerId: fileInfo.metadata?.owner?.toString() },
    );

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

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.RENAME_FILE,
      fileId,
      'FILE',
      trimmedName,
      {
        previousName: files[0].filename,
      },
    );

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

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.MOVE_FILE,
      fileId,
      'FILE',
      file.filename,
      {
        fromFolderId: file.metadata?.folderId?.toString() || null,
        toFolderId: destinationFolderObjectId?.toString() || null,
      },
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

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.DELETE_FOLDER,
      folderId,
      'FOLDER',
      folderExists.filename || folderId,
    );
  }

  //* Archivos afectados por una operación en cascada (se consultan antes de modificarlos para poder registrarlos)
  private async findFilesByFilter(filter: Record<string, any>) {
    const files = await this.connection.db
      ?.collection('uploads.files')
      .find(filter)
      .project({ _id: 1, filename: 1 })
      .toArray();
    return files ?? [];
  }

  //* Una entrada de log por archivo afectado; viaFolderId indica la carpeta que originó la operación
  private logFilesViaFolder(
    userId: string,
    action: ActivityAction,
    files: { _id: any; filename?: string }[],
    rootFolderId: string,
    details: Record<string, any> = {},
  ) {
    return this.activityLogService.tryLogEvents(
      files.map((file) => ({
        userId,
        action,
        resourceId: file._id.toString(),
        resourceType: 'FILE' as const,
        resourceName: file.filename || file._id.toString(),
        details: { ...details, viaFolderId: rootFolderId },
      })),
    );
  }

  async deleteFilesByFolderIds(folderIds: Types.ObjectId[], ownerId: string, rootFolderId: string): Promise<number> {
    const filter = {
      'metadata.owner': new Types.ObjectId(ownerId),
      'metadata.folderId': { $in: folderIds },
      'metadata.isTrash': { $ne: true }, //* Excluir archivos en papelera
    };

    const affected = await this.findFilesByFilter(filter);

    const files = await this.connection.db?.collection('uploads.files').updateMany(
      filter,
      { $set: { 'metadata.isTrash': true, 'metadata.deleteAt': new Date() } },
    );

    await this.logFilesViaFolder(ownerId, ActivityAction.DELETE_FILE, affected, rootFolderId);

    return files?.modifiedCount || 0;
  }

  //* Buscar archivo por nombre
  async searchFilesByName(ownerId: string, name: string) {

    if (!name || name.trim() === '') return []

    const files = await this.gridFSBucket.find({
      'metadata.owner': new Types.ObjectId(ownerId),
      'metadata.isTrash': { $ne: true }, //* Excluir archivos en papelera
      filename: { $regex: name.trim(), $options: 'i' }
    }).toArray()

    return files.map((file) => ({
      id: file._id,
      filename: file.filename,
      length: file.length,
      uploadDate: file.uploadDate,
      contentType: file.metadata?.contentType,
      folderId: file.metadata?.folderId || null,
    }))
  }

  async getTrashedFiles(ownerId: string) {
    const files = await this.gridFSBucket.find({
      'metadata.owner': new Types.ObjectId(ownerId),
      'metadata.isTrash': true,
    }).toArray();

    return files.map((file) => ({
      _id: file._id.toString(),
      id: file._id.toString(),
      filename: file.filename,
      length: file.length,
      deletedAt: file.metadata?.deletedAt || null,
      contentType: file.metadata?.contentType,
      folderId: file.metadata?.folderId ? file.metadata.folderId.toString() : null,
    }));
  }

  async restoreFile(fileId: string, ownerId: string) {
    if (!fileId || !Types.ObjectId.isValid(fileId)) {
      throw new BadRequestException('ID de archivo no válido');
    }
    const fileObjectId = new Types.ObjectId(fileId);
    const ownerObjectId = new Types.ObjectId(ownerId);

    const file = await this.connection.db?.collection('uploads.files').findOne({
      _id: fileObjectId,
      'metadata.owner': ownerObjectId,
      'metadata.isTrash': true,
    });

    if (!file) {
      throw new NotFoundException('Archivo no encontrado o no tienes permiso para acceder a él');
    }

    let targetFolderId = file.metadata?.folderId || null;
    if (targetFolderId) {
      const folderExists = await this.connection.db?.collection('folders').findOne({
        _id: targetFolderId,
        isTrash: false,
      });
      if (!folderExists) {
        targetFolderId = null;
      }
    }

    await this.connection.db?.collection('uploads.files').updateOne(
      { _id: fileObjectId },
      {
        $set: {
          'metadata.isTrash': false,
          'metadata.deletedAt': null,
          'metadata.folderId': targetFolderId,
        },
      },
    );

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.RESTORE_FILE,
      fileId,
      'FILE',
      file.filename,
    );

    return { message: 'Archivo restaurado correctamente' };
  }

  async hardDeleteFile(fileId: string, ownerId: string) {
    if (!fileId || !Types.ObjectId.isValid(fileId)) {
      throw new BadRequestException('ID de archivo no válido');
    }

    const fileObjectId = new Types.ObjectId(fileId);

    const file = await this.gridFSBucket.find({
      _id: fileObjectId,
      'metadata.owner': new Types.ObjectId(ownerId),
      'metadata.isTrash': true,
    }).toArray();

    if (!file || file.length === 0) {
      throw new NotFoundException('Archivo no encontrado o no tienes permiso para acceder a él');
    }

    //* Borrar chunks y metadata del archivo
    await this.gridFSBucket.delete(fileObjectId);

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.HARD_DELETE_FILE,
      fileId,
      'FILE',
      file[0].filename,
    );

    return { message: 'Archivo eliminado permanentemente' };
  }

  //* Eliminar archivos por carpeta
  async hardDeleteFilesByFolderIds(folderIds: Types.ObjectId[], ownerId: string, rootFolderId: string): Promise<void> {
    const files = await this.gridFSBucket.find({
      'metadata.owner': new Types.ObjectId(ownerId),
      'metadata.folderId': { $in: folderIds },
    }).toArray();

    for (const file of files) {
      await this.gridFSBucket.delete(file._id);
    }

    await this.logFilesViaFolder(ownerId, ActivityAction.HARD_DELETE_FILE, files, rootFolderId);
  }

  //* Restaurar archivos por carpeta
  async restoreFilesByFolderIds(folderIds: Types.ObjectId[], ownerId: string, rootFolderId: string): Promise<void> {
    const filter = {
      'metadata.owner': new Types.ObjectId(ownerId),
      'metadata.folderId': { $in: folderIds },
      'metadata.isTrash': true, //* Solo archivos en papelera
    };

    const affected = await this.findFilesByFilter(filter);

    await this.connection.db?.collection('uploads.files').updateMany(
      filter,
      { $set: { 'metadata.isTrash': false, 'metadata.deletedAt': null } },
    );

    await this.logFilesViaFolder(ownerId, ActivityAction.RESTORE_FILE, affected, rootFolderId);
  }

  //* Compartir archivo
  async shareFile(fileId: string, ownerId: string, targetUserId: string, permission: PermissionLevel) {

    if (!Types.ObjectId.isValid(fileId)) {
      throw new NotFoundException('Archivo no encontrado en la base de datos');
    }

    const fileObjectId = new Types.ObjectId(fileId);
    const ownerObjectId = new Types.ObjectId(ownerId);
    const targetUserObjectId = new Types.ObjectId(targetUserId);

    if (ownerId === targetUserId) {
      throw new BadRequestException('No puedes compartir un archivo contigo mismo');
    }

    //* Verificar si el archivo existe y le pertenece al usuario
    const file = await this.connection.db?.collection('uploads.files').findOne({
      _id: fileObjectId,
      'metadata.owner': ownerObjectId,
      'metadata.isTrash': { $ne: true }, //* Excluir archivos en papelera
    })

    if (!file) {
      throw new NotFoundException('Archivo no encontrado o no tienes permiso para acceder a él');
    }

    //* Actualizar el arreglo de compartidos 
    await this.connection.db?.collection('uploads.files').updateOne(
      { _id: fileObjectId },
      { $push: { 'metadata.sharedWith': { userId: targetUserObjectId } } as any }
    )

    await this.connection.db?.collection('uploads.files').updateOne(
      { _id: fileObjectId },
      { $push: { 'metadata.sharedWith': { userId: targetUserObjectId, permission } } as any }
    )

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.SHARE_RESOURCE,
      fileId,
      'FILE',
      file.filename,
      {
        targetUserId,
        permission,
      },
    );

    return { message: 'Permiso actualizados correctamente' }

  }

  //* Revocar permisos
  async revokeShareFile(fileId: string, ownerId: string, targetUserId: string) {
    const fileObjectId = new Types.ObjectId(fileId);
    const targetUserObjectId = new Types.ObjectId(targetUserId);

    const result = await this.connection.db?.collection('uploads.files').updateOne(
      { _id: fileObjectId, 'metadata.owner': new Types.ObjectId(ownerId) },
      { $pull: { 'metadata.sharedWith': { userId: targetUserObjectId } } as any }
    );

    if (result?.modifiedCount === 0) {
      throw new NotFoundException('Archivo no encontrado o el usuario no tenía permisos');
    }

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.REVOKE_SHARE,
      fileId,
      'FILE',
      fileId,
      {
        targetUserId,
      },
    );

    return { message: 'Permiso revocado con éxito' };
  }

  async shareFilesByFolderIds(
    folderIds: Types.ObjectId[],
    ownerId: string,
    targetUserId: string,
    permission: string,
    rootFolderId: string,
  ) {
    const targetUserObjectId = new Types.ObjectId(targetUserId);
    const filter = { 'metadata.owner': new Types.ObjectId(ownerId), 'metadata.folderId': { $in: folderIds } };

    const affected = await this.findFilesByFilter(filter);

    //* Remover permiso previo si existía
    await this.connection.db?.collection('uploads.files').updateMany(
      filter,
      { $pull: { 'metadata.sharedWith': { userId: targetUserObjectId } } as any }
    );

    //* Insertar nuevo permiso
    await this.connection.db?.collection('uploads.files').updateMany(
      filter,
      { $push: { 'metadata.sharedWith': { userId: targetUserObjectId, permission } } as any }
    );

    await this.logFilesViaFolder(ownerId, ActivityAction.SHARE_RESOURCE, affected, rootFolderId, {
      targetUserId,
      permission,
    });
  }

  async revokeShareFilesByFolderIds(
    folderIds: Types.ObjectId[],
    ownerId: string,
    targetUserId: string,
    rootFolderId: string,
  ) {
    const targetUserObjectId = new Types.ObjectId(targetUserId);
    const filter = { 'metadata.owner': new Types.ObjectId(ownerId), 'metadata.folderId': { $in: folderIds } };

    const affected = await this.findFilesByFilter(filter);

    await this.connection.db?.collection('uploads.files').updateMany(
      filter,
      { $pull: { 'metadata.sharedWith': { userId: targetUserObjectId } } as any }
    );

    await this.logFilesViaFolder(ownerId, ActivityAction.REVOKE_SHARE, affected, rootFolderId, { targetUserId });
  }

  async updateFileContent(
    fileId: string,
    userId: string,
    content: string,
    currentVersion: number,
  ) {
    if (!Types.ObjectId.isValid(fileId)) {
      throw new NotFoundException('ID de archivo no válido');
    }

    const fileObjectId = new Types.ObjectId(fileId);
    const userObjectId = new Types.ObjectId(userId);

    //* Obtener metadatos del archivo y validar la existencia
    const file = await this.connection.db?.collection('uploads.files').findOne({
      _id: fileObjectId,
      'metadata.isTrash': { $ne: true },
    });

    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    //* Verificar permisos (Debe ser el dueño O tener permiso 'edit' en sharedWith)
    const isOwner = file.metadata.owner.toString() === userId;
    const sharedEntry = file.metadata.sharedWith?.find(
      (s: any) => s.userId.toString() === userId,
    );
    const hasEditPermission = sharedEntry && sharedEntry.permission === 'edit';

    if (!isOwner && !hasEditPermission) {
      throw new ForbiddenException('No tienes permisos de edición sobre este archivo');
    }

    //* Validar Control de Concurrencia Optimista
    const dbVersion = file.metadata.version || 1;
    if (currentVersion !== dbVersion) {
      throw new ConflictException({
        message: 'El archivo ha sido modificado por otro usuario mientras lo editabas.',
        currentServerVersion: dbVersion,
        fileId,
      });
    }

    /*
    * Reemplazar contenido binario en GridFS
    * Eliminar los bloques antiguos de GridFS
     */
    await this.gridFSBucket.delete(fileObjectId);

    //* Convertimos el string a un Readable Stream
    const readableStream = new Readable();
    readableStream.push(content);
    readableStream.push(null);

    const bufferSize = Buffer.byteLength(content, 'utf8');
    const nextVersion = dbVersion + 1;

    //* Abrir el stream de subida conservando el mismo ObjectId para no romper enlaces
    const uploadStream = this.gridFSBucket.openUploadStreamWithId(
      fileObjectId,
      file.filename,
      {
        metadata: {
          ...file.metadata,
          size: bufferSize,
          version: nextVersion,
          updatedAt: new Date(),
          lastModifiedBy: userObjectId,
        },
      },
    );

    return new Promise((resolve, reject) => {
      readableStream
        .pipe(uploadStream)
        .on('error', (err) => reject(err))
        .on('finish', async () => {
          try {
            await this.activityLogService.logEvent(
              userId,
              ActivityAction.UPDATE_FILE,
              fileId,
              'FILE',
              file.filename,
              {
                version: nextVersion,
              },
            );

            resolve({
              id: fileId,
              filename: file.filename,
              version: nextVersion,
              message: 'Archivo actualizado con éxito',
            });
          } catch (error) {
            reject(error);
          }
        });
    });
  }

  async getEditableFileContent(fileId: string, userId: string) {
    if (!Types.ObjectId.isValid(fileId)) {
      throw new NotFoundException('ID de archivo no válido');
    }

    const fileObjectId = new Types.ObjectId(fileId);
    const userObjectId = new Types.ObjectId(userId);

    const files = await this.gridFSBucket.find({
      _id: fileObjectId,
      'metadata.isTrash': { $ne: true },
      $or: [
        { 'metadata.owner': userObjectId },
        { 'metadata.sharedWith.userId': userObjectId },
      ],
    }).toArray();

    if (!files || files.length === 0) {
      throw new NotFoundException('Archivo no encontrado o sin acceso');
    }

    const file = files[0];
    const fileName = file.filename.toLowerCase();
    if (!fileName.endsWith('.txt') && !fileName.endsWith('.md')) {
      throw new BadRequestException('Solo se permite editar archivos .txt o .md');
    }

    if (!file.metadata) {
      throw new BadRequestException('El archivo no contiene metadatos válidos');
    }

    const isOwner = file.metadata.owner.toString() === userId;
    const sharedEntry = file.metadata.sharedWith?.find(
      (s: any) => s.userId.toString() === userId,
    );
    const hasEditPermission = sharedEntry && sharedEntry.permission === 'edit';

    if (!isOwner && !hasEditPermission) {
      throw new ForbiddenException('No tienes permisos de edición sobre este archivo');
    }

    await this.activityLogService.tryLogEvent(
      userId,
      ActivityAction.VIEW_FILE,
      fileId,
      'FILE',
      file.filename,
      { mode: 'editor', ownerId: file.metadata.owner.toString() },
    );

    const content = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.gridFSBucket
        .openDownloadStream(fileObjectId)
        .on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        .on('error', (error) => reject(error))
        .on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });

    return {
      id: fileObjectId.toString(),
      filename: file.filename,
      content,
      version: file.metadata.version || 1,
    };
  }

}