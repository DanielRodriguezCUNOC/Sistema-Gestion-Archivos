import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Folder } from './schemas/folder.schema.js';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import { FilesService } from '../files/files.service.js';
import { FilesStack } from './utils/file-stack.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { ActivityAction } from '../activity-log/utils/activity-action.enum.js';

@Injectable()
export class FoldersService {
  constructor(
    @InjectModel(Folder.name) private readonly folderModel: Model<Folder>,
    private readonly filesService: FilesService,
    private readonly activityLogService: ActivityLogService,
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

    const savedFolder = await newFolder.save();

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.CREATE_FOLDER,
      (savedFolder._id as Types.ObjectId).toString(),
      'FOLDER',
      savedFolder.name,
      {
        parentFolderId: savedFolder.parentFolderId?.toString() || null,
      },
    );

    return savedFolder;
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
    let targetFolderObjectId: Types.ObjectId | null = null;

    if (folderId && folderId !== 'undefined' && folderId !== 'null') {
      if (!Types.ObjectId.isValid(folderId)) {
        throw new BadRequestException('ID de carpeta no válido');
      }
      targetFolderObjectId = new Types.ObjectId(folderId);

      currentFolder = await this.folderModel.findOne({
        _id: targetFolderObjectId,
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
      $or: [
        { owner: new Types.ObjectId(ownerId) },
        { 'sharedWith.userId': new Types.ObjectId(ownerId) },
      ],
      isTrash: false,
    };

    if (search && search.trim() !== '') {
      folderQuery.name = { $regex: search.trim(), $options: 'i' };
    } else {
      folderQuery.parentFolderId = targetFolderObjectId ? targetFolderObjectId : { $in: [null, undefined] };
    }

    let folderSortField = 'name';
    if (sortBy === 'date') folderSortField = 'createdAt';
    const sortOrder = order === 'desc' ? -1 : 1;

    const rawSubfolders = await this.folderModel
      .find(folderQuery)
      .sort({ [folderSortField]: sortOrder })
      .exec();

    const subfolders = rawSubfolders.map(folder => ({
      _id: (folder._id as Types.ObjectId).toString(),
      id: (folder._id as Types.ObjectId).toString(),
      name: folder.name,
      owner: folder.owner.toString(),
      parentFolderId: folder.parentFolderId ? folder.parentFolderId.toString() : null,
      isTrash: folder.isTrash,
      deletedAt: folder.deletedAt ? folder.deletedAt.toISOString() : null,
      sharedWith: folder.sharedWith,
      createdAt: (folder as any).createdAt,
      updatedAt: (folder as any).updatedAt,
    }));

    const files = await this.filesService.listFilesByFolder(
      ownerId,
      targetFolderObjectId ? targetFolderObjectId.toString() : undefined,
      search,
      sortBy,
      order,
    );

    return {
      currentFolder: currentFolder
        ? {
          id: (currentFolder._id as Types.ObjectId).toString(),
          _id: (currentFolder._id as Types.ObjectId).toString(),
          name: currentFolder.name,
          parentFolderId: currentFolder.parentFolderId ? currentFolder.parentFolderId.toString() : null,
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
    const ownerObjectId = new Types.ObjectId(ownerId);

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

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.DELETE_FOLDER,
      folderId,
      'FOLDER',
      targetFolder.name,
      {
        deletedFoldersCount: folderDeleteResult.modifiedCount,
        deletedFilesCount,
      },
    );

    return {
      message: 'La carpeta y contenido enviados a papelera',
      deletedFoldersCount: folderDeleteResult.modifiedCount,
      deletedFilesCount,
    }

  }

  async renameFolder(folderId: string, ownerId: string, newName: string) {
    if (!Types.ObjectId.isValid(folderId)) {
      throw new NotFoundException('Carpeta no encontrada en la base de datos');
    }

    const folderObjectId = new Types.ObjectId(folderId);
    const ownerObjectId = new Types.ObjectId(ownerId);

    const folder = await this.folderModel.findOne({
      _id: folderObjectId,
      owner: ownerObjectId,
      isTrash: false,
    }).exec();

    if (!folder) {
      throw new NotFoundException('Carpeta no encontrada o sin acceso');
    }

    const previousName = folder.name;
    const trimmedName = newName.trim();

    folder.name = trimmedName;
    await folder.save();

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.RENAME_FOLDER,
      folderId,
      'FOLDER',
      trimmedName,
      {
        previousName,
      },
    );

    return {
      id: folderId,
      name: trimmedName,
      message: 'Carpeta renombrada correctamente',
    };
  }

  private async getAllSubfolderIds(
    initialFolderId: Types.ObjectId,
    ownerObjectId: Types.ObjectId,
    isTrash?: boolean,
  ): Promise<Types.ObjectId[]> {
    const folderIds: Types.ObjectId[] = [initialFolderId];
    const queue: Types.ObjectId[] = [initialFolderId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const filter: Record<string, any> = {
        parentFolderId: currentId,
        owner: ownerObjectId,
      };
      if (typeof isTrash === 'boolean') {
        filter.isTrash = isTrash;
      }
      const children = await this.folderModel.find(filter, { _id: 1 }).exec();

      for (const child of children) {
        const childId = child._id as Types.ObjectId;
        folderIds.push(childId);
        queue.push(childId);
      }
    }
    return folderIds;
  }

  async getTrashedFolders(ownerId: string) {
    const folders = await this.folderModel.find({
      owner: new Types.ObjectId(ownerId),
      isTrash: true,
    }).exec();

    return folders.map(folder => ({
      _id: (folder._id as Types.ObjectId).toString(),
      id: (folder._id as Types.ObjectId).toString(),
      name: folder.name,
      owner: folder.owner.toString(),
      parentFolderId: folder.parentFolderId ? folder.parentFolderId.toString() : null,
      isTrash: folder.isTrash,
      deletedAt: folder.deletedAt ? folder.deletedAt.toISOString() : null,
      sharedWith: folder.sharedWith,
      createdAt: (folder as any).createdAt,
      updatedAt: (folder as any).updatedAt,
    }));
  }

  async restoreFolder(folderId: string, ownerId: string) {
    if (!folderId || !Types.ObjectId.isValid(folderId)) {
      throw new BadRequestException('ID de carpeta no válido');
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

    let newParentId: Types.ObjectId | null = folder.parentFolderId;
    if (newParentId) {
      const parent = await this.folderModel.findOne({
        _id: newParentId,
        isTrash: false,
      }).exec();
      if (!parent) {
        newParentId = null;
      }
    }

    const allFolderIds = await this.getAllSubfolderIds(targetFolderObjectId, ownerObjectId, true);

    await this.filesService.restoreFilesByFolderIds(allFolderIds, ownerId);

    await this.folderModel.updateMany(
      { _id: { $in: allFolderIds }, owner: ownerObjectId },
      { $set: { isTrash: false, deletedAt: null } },
    ).exec();

    await this.folderModel.updateOne(
      { _id: targetFolderObjectId },
      { $set: { parentFolderId: newParentId, isTrash: false, deletedAt: null } },
    ).exec();

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.RESTORE_FOLDER,
      folderId,
      'FOLDER',
      folder.name,
    );

    return { message: 'Carpeta y subcarpetas restauradas correctamente' };
  }

  async hardDeleteFolder(folderId: string, ownerId: string) {
    if (!folderId || !Types.ObjectId.isValid(folderId)) {
      throw new BadRequestException('ID de carpeta no válido');
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

    const allFolderIds = await this.getAllSubfolderIds(targetFolderObjectId, ownerObjectId, true);

    await this.filesService.hardDeleteFilesByFolderIds(allFolderIds, ownerId);

    await this.folderModel.deleteMany({
      _id: { $in: allFolderIds },
      owner: ownerObjectId,
    }).exec();

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.HARD_DELETE_FOLDER,
      folderId,
      'FOLDER',
      folder.name,
      {
        deletedFoldersCount: allFolderIds.length,
      },
    );

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

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.SHARE_RESOURCE,
      folderId,
      'FOLDER',
      folder.name,
      {
        targetUserId,
        permission,
      },
    );

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

    const folder = await this.folderModel.findById(folderObjectId).exec();

    await this.activityLogService.logEvent(
      ownerId,
      ActivityAction.REVOKE_SHARE,
      folderId,
      'FOLDER',
      folder?.name || folderId,
      {
        targetUserId,
      },
    );

    return { message: 'Permisos revocados con éxito de la carpeta y su contenido' };
  }

}