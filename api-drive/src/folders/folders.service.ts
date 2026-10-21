import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Folder } from './schemas/folder.schema.js';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import { FilesService } from '../files/files.service.js';
import { FilesStack } from './utils/file-stack.js';
import { exec } from 'child_process';

@Injectable()
export class FoldersService {
  constructor(
    @InjectModel(Folder.name) private readonly folderModel: Model<Folder>,
    private readonly filesService: FilesService,
  ) { }

  async createFolder(createFolderDto: CreateFolderDto, ownerId: string): Promise<Folder> {
    const { name, parentFolderId } = createFolderDto;
    let parentObjectId: Types.ObjectId | null = null;

    if (parentFolderId) {
      const parentFolder = await this.folderModel.findOne({
        _id: new Types.ObjectId(parentFolderId),
        owner: new Types.ObjectId(ownerId),
      }).exec();

      if (!parentFolder) {
        throw new NotFoundException('La carpeta padre no existe o no te pertenece');
      }

      parentObjectId = parentFolder._id as Types.ObjectId;
    }

    const newFolder = new this.folderModel({
      name: name.trim(),
      owner: new Types.ObjectId(ownerId),
      parentFolderId: parentObjectId,
    });

    return newFolder.save();
  }

  async getFolderContents(
    ownerId: string,
    folderId?: string,
    search?: string,
    sortBy: string = 'name',
    order: 'asc' | 'desc' = 'asc',
  ) {
    let currentFolder: Folder | null = null;
    const filesStack: FilesStack[] = [];

    if (folderId && Types.ObjectId.isValid(folderId)) {
      currentFolder = await this.folderModel.findOne({
        _id: new Types.ObjectId(folderId),
        $or: [
          { owner: new Types.ObjectId(ownerId) },
          { 'sharedWith.userId': new Types.ObjectId(ownerId) },
        ],
      }).exec();

      if (!currentFolder) {
        throw new NotFoundException('Carpeta no encontrada o sin acceso');
      }

      let tempFolder: Folder | null = currentFolder;
      while (tempFolder) {
        const folderIdStr = (tempFolder._id as Types.ObjectId).toString();
        filesStack.unshift({
          id: folderIdStr,
          name: tempFolder.name,
        });

        if (tempFolder.parentFolderId) {
          tempFolder = await this.folderModel.findById(tempFolder.parentFolderId).exec();
        } else {
          tempFolder = null;
        }
      }
    }

    const folderQuery: Record<string, any> = {
      owner: new Types.ObjectId(ownerId),
      isTrash: false,
    };

    if (search && search.trim() !== '') {
      folderQuery.name = { $regex: search.trim(), $options: 'i' };
    } else {
      folderQuery.parentFolderId = folderId ? new Types.ObjectId(folderId) : null;
    }

    let folderSortField = 'name';
    if (sortBy === 'date') folderSortField = 'createdAt';
    const sortOrder = order === 'desc' ? -1 : 1;

    const subfolders = await this.folderModel
      .find(folderQuery)
      .sort({ [folderSortField]: sortOrder })
      .exec();

    const files = await this.filesService.listFilesByFolder(
      ownerId, folderId, search, sortBy, order);

    return {
      currentFolder: currentFolder
        ? {
            id: (currentFolder._id as Types.ObjectId).toString(),
            name: currentFolder.name,
            parentFolderId: currentFolder.parentFolderId,
          }
        : null,
      filesStack,
      subfolders,
      files,
    };
  }

  //* Eliminar carpeta, subcarpetas y archivos asociados
  async deleteFolder(folderId: string, ownerId: string) {
  if (!Types.ObjectId.isValid(folderId)) {
    throw new NotFoundException('Carpeta no encontrada en la base de datos');
  }

  const targetFolderObjectId = new Types.ObjectId(folderId);
  const ownerObjectId = targetFolderObjectId;

  //* verificar existencia y permisos
  const targetFolder = await this.folderModel.findOne({
    _id: targetFolderObjectId,
    owner: ownerObjectId,
  }).exec();

  if (!targetFolder) {
    throw new NotFoundException('Carpeta no encontrada o sin acceso');
  }

  //* Obtener el arbol de carpetas y subcarpetas
  const allFolderIds = await this.getAllSubfolderIds(targetFolderObjectId, ownerObjectId);

  //* Eliminar archivos asociados a estas carpetas
  const deletedFilesCount = await this.filesService.deleteFilesByFolderIds(allFolderIds, ownerId);

  //* Eliminar las carpetas encontradas 
  const folderDeleteResult = await this.folderModel.updateMany({
    _id: { $in: allFolderIds },
    owner: ownerObjectId,
  },
    { $set: { isTrash: true, deletedAt: new Date() } }
  ).exec();

  return {
    message: 'La carpeta y contenido enviados a papelera',
    deletedFoldersCount: folderDeleteResult.modifiedCount,
    deletedFilesCount,
  }

}

  //* Metodo que obtiene los IDs de las subcarpetas 
  private async getAllSubfolderIds(initialFolderId: Types.ObjectId,
  ownerObjectId: Types.ObjectId,
): Promise < Types.ObjectId[] > {
  const folderIds: Types.ObjectId[] = [initialFolderId];
  const queue: Types.ObjectId[] = [initialFolderId];

  while(queue.length > 0) {
  const currentId = queue.shift()
  const children = await this.folderModel.find({
    parentFolderId: currentId,
    owner: ownerObjectId,
    isTrash: false,
  }, { _id: 1 }
  ).exec();

  for (const child of children) {
    const childId = child._id as Types.ObjectId;
    folderIds.push(childId);
    queue.push(childId);
  }
}
return folderIds;
  }

  //* Listar carpetas en papelera
  async getTrashedFolders(ownerId: string) {
  return this.folderModel.find({
    owner: new Types.ObjectId(ownerId),
    isTrash: true,
  }).exec();
}

  //* Restaurar carpeta y subcarpetas
  async restoreFolder(folderId: string, ownerId: string) {
  if (!Types.ObjectId.isValid(folderId)) {
    throw new NotFoundException('Carpeta no encontrada en la base de datos');
  }
  const ownerObjectId = new Types.ObjectId(ownerId);
  const targetFolderObjectId = new Types.ObjectId(folderId);

  const folder = await this.folderModel.findOne({
    _id: targetFolderObjectId,
    owner: ownerObjectId,
    isTrash: true,
  }).exec();

  if (!folder) {
    throw new NotFoundException('Carpeta no encontrada o sin acceso');
  }

  //* Revisar si la carpeta padre existe y no está en papelera
  let newParentId = folder.parentFolderId;
  if (newParentId) {
    const parent = await this.folderModel.findOne({
      _id: newParentId,
      isTrash: false
    }).exec()
    if (!parent) {
      newParentId = null; // Si la carpeta padre no existe o está en papelera, se establece como raíz
    }
  }

  //* Obtener todos los hijos
  const allFolderIds = await this.getAllSubfolderIds(targetFolderObjectId, ownerObjectId);

  //* Restaurar archivos de las carpetas
  await this.filesService.restoreFilesByFolderIds(allFolderIds, ownerId);

  //* Restaurar carpetas
  await this.folderModel.updateOne(
    { _id: { $in: allFolderIds } },
    { $set: { isTrash: false, deletedAt: null } },
  ).exec();

  return { message: 'Carpeta y subcarpetas restauradas correctamente' };
}

  //* Eliminar carpeta de forma permanente
  async hardDeleteFolder(folderId: string, ownerId: string) {
  if (!Types.ObjectId.isValid(folderId)) {
    throw new NotFoundException('Carpeta no encontrada en la base de datos');
  }

  const targetFolderObjectId = new Types.ObjectId(folderId);
  const ownerObjectId = new Types.ObjectId(ownerId);

  const folder = await this.folderModel.findOne({
    _id: targetFolderObjectId,
    owner: ownerObjectId,
    isTrash: true,
  }).exec();

  if (!folder) {
    throw new NotFoundException('Carpeta no encontrada o sin acceso');
  }

  //* Obtener todos los hijos
  const allFolderIds = await this.getAllSubfolderIds(targetFolderObjectId, ownerObjectId);

  //* Hard delete fisico de archivos
  await this.filesService.hardDeleteFilesByFolderIds(allFolderIds, ownerId);

  //* Hard delete fisico de carpetas
  await this.folderModel.deleteMany({
    _id: { $in: allFolderIds },
    owner: ownerObjectId,
  }).exec();

  return { message: 'Carpeta y subcarpetas eliminadas permanentemente' };
}

  async shareFolder(folderId: string, ownerId: string, targetUserId: string, permission: string) {
  if (!Types.ObjectId.isValid(folderId) || !Types.ObjectId.isValid(targetUserId)) {
    throw new BadRequestException('ID inválido');
  }

  const folderObjectId = new Types.ObjectId(folderId);
  const ownerObjectId = new Types.ObjectId(ownerId);
  const targetUserObjectId = new Types.ObjectId(targetUserId);

  if (ownerId === targetUserId) {
    throw new BadRequestException('No puedes compartir una carpeta contigo mismo');
  }

  const folder = await this.folderModel.findOne({
    _id: folderObjectId,
    owner: ownerObjectId,
    isTrash: false
  }).exec();

  if (!folder) throw new NotFoundException('Carpeta no encontrada o no tienes permisos');

  //* Obtener toda la jerarquía de subcarpetas
  const allFolderIds = await this.getAllSubfolderIds(folderObjectId, ownerObjectId);

  //* Actualizar permisos en todas las carpetas 
  await this.folderModel.updateMany(
    { _id: { $in: allFolderIds } },
    { $pull: { sharedWith: { userId: targetUserObjectId } } as any }
  ).exec();

  await this.folderModel.updateMany(
    { _id: { $in: allFolderIds } },
    { $push: { sharedWith: { userId: targetUserObjectId, permission } } as any }
  ).exec();

  //* Actualizar permisos en todos los archivos contenidos en esas carpetas
  await this.filesService.shareFilesByFolderIds(allFolderIds, ownerId, targetUserId, permission);

  return { message: 'Carpeta y contenidos compartidos con éxito' };
}

  async revokeShareFolder(folderId: string, ownerId: string, targetUserId: string) {
  const folderObjectId = new Types.ObjectId(folderId);
  const ownerObjectId = new Types.ObjectId(ownerId);
  const targetUserObjectId = new Types.ObjectId(targetUserId);

  const allFolderIds = await this.getAllSubfolderIds(folderObjectId, ownerObjectId);

  // Revocar en carpetas
  await this.folderModel.updateMany(
    { _id: { $in: allFolderIds } },
    { $pull: { sharedWith: { userId: targetUserObjectId } } as any }
  ).exec();

  // Revocar en archivos
  await this.filesService.revokeShareFilesByFolderIds(allFolderIds, ownerId, targetUserId);

  return { message: 'Permisos revocados con éxito de la carpeta y su contenido' };
}

}