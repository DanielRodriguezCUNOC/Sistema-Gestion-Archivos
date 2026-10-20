import { Injectable, NotFoundException } from '@nestjs/common';
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

    //* Reconstrucción de la ruta si se pasa un folderId válido
    if (folderId && Types.ObjectId.isValid(folderId)) {
      currentFolder = await this.folderModel.findOne({
        _id: new Types.ObjectId(folderId),
        owner: new Types.ObjectId(ownerId),
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

    //* Consulta de subcarpetas con ordenamiento
    const folderQuery: Record<string, any> = { owner: new Types.ObjectId(ownerId) };
    if (search && search.trim() !== '') {
      folderQuery.name = { $regex: search.trim(), $options: 'i' };
    } else {
      folderQuery.parentFolderId = folderId ? new Types.ObjectId(folderId) : null;
    }

    //* Consultar subcarpetas ordenadas
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
    const folderDeleteResult = await this.folderModel.deleteMany({
      _id: { $in: allFolderIds },
      owner: ownerObjectId,
    }).exec();

    return {
      message: 'La carpeta y su contenido han sido eliminados correctamente',
      deletedFoldersCount: folderDeleteResult.deletedCount,
      deletedFilesCount,
    }

  }



  //* Metodo que obtiene los IDs de las subcarpetas 
  private async getAllSubfolderIds(initialFolderId: Types.ObjectId,
    ownerObjectId: Types.ObjectId,
  ): Promise<Types.ObjectId[]> {
    const folderIds: Types.ObjectId[] = [initialFolderId];
    const queue: Types.ObjectId[] = [initialFolderId];

    while (queue.length > 0) {
      const currentId = queue.shift()
      const children = await this.folderModel.find({
        parentFolderId: currentId,
        owner: ownerObjectId,
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

}