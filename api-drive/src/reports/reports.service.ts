import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Types } from 'mongoose';
import { UserProfile } from './utils/user-profile.interface.js';
import { GroupingPeriod } from './utils/grouping-period.enum.js';

@Injectable()
export class ReportsService {
  constructor(@InjectConnection() private readonly connection: Connection) { }

  async getFilesGroupedByType(userId?: string) {
    const matchStage: Record<string, any> = {
      'metadata.isTrash': { $ne: true }, // Excluir archivos en papelera
    };

    if (userId && Types.ObjectId.isValid(userId)) {
      matchStage['metadata.owner'] = new Types.ObjectId(userId);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $project: {
          filename: 1,
          length: 1,
          contentType: '$metadata.contentType',
          extension: {
            $toLower: {
              $arrayElemAt: [{ $split: ['$filename', '.'] }, -1],
            },
          },
        },
      },
      {
        $group: {
          _id: '$extension',
          totalFiles: { $sum: 1 },
          totalBytes: { $sum: '$length' },
          mimeTypes: { $addToSet: '$contentType' },
        },
      },
      {
        $project: {
          _id: 0,
          type: '$_id',
          totalFiles: 1,
          totalBytes: 1,
          totalMB: { $round: [{ $divide: ['$totalBytes', 1024 * 1024] }, 2] },
          mimeTypes: 1,
        },
      },
      { $sort: { totalFiles: -1 } },
    ];

    const result = await this.connection.db
      ?.collection('uploads.files')
      .aggregate(pipeline)
      .toArray();

    return result || [];
  }

  async getFilesByDateRange(startDate: string, endDate: string, userId?: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    end.setUTCHours(23, 59, 59, 999);

    const matchStage: Record<string, any> = {
      'metadata.isTrash': { $ne: true }, //* Excluir papelera
      uploadDate: {
        $gte: start,
        $lte: end,
      },
    };

    if (userId && Types.ObjectId.isValid(userId)) {
      matchStage['metadata.owner'] = new Types.ObjectId(userId);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $project: {
          _id: 1,
          filename: 1,
          length: 1,
          uploadDate: 1,
          owner: '$metadata.owner',
          contentType: '$metadata.contentType',
          folderId: '$metadata.folderId',
          version: '$metadata.version',
        },
      },
      {
        //* Unir la información del propietario desde la colección de usuarios
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'ownerInfo',
        },
      },
      { $unwind: { path: '$ownerInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          id: '$_id',
          _id: 0,
          filename: 1,
          uploadDate: 1,
          sizeInBytes: '$length',
          sizeInKB: { $round: [{ $divide: ['$length', 1024] }, 2] },
          contentType: 1,
          folderId: 1,
          version: { $ifNull: ['$version', 1] },
          owner: {
            id: '$ownerInfo._id',
            name: '$ownerInfo.name',
            email: '$ownerInfo.email',
          },
        },
      },
      { $sort: { uploadDate: -1 } },
    ];

    const files = await this.connection.db
      ?.collection('uploads.files')
      .aggregate(pipeline)
      .toArray();

    return {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      totalFilesFound: files?.length || 0,
      files: files || [],
    };
  }

  async getTopActiveFiles(limit: number = 10, userId?: string) {
    const matchStage: Record<string, any> = {
      resourceType: 'FILE',
    };

    if (userId && Types.ObjectId.isValid(userId)) {
      matchStage.userId = new Types.ObjectId(userId);
    }

    const pipeline = [
      //* Filtrar actividades relacionadas con archivos
      { $match: matchStage },

      //* Agrupar por el ID del recurso (archivo) y contar operaciones
      {
        $group: {
          _id: '$resourceId',
          totalOperations: { $sum: 1 },
          lastActivity: { $max: '$createdAt' },
          actionsPerformed: { $addToSet: '$action' },
        },
      },

      //* Ordenar por cantidad de operaciones de mayor a menor
      { $sort: { totalOperations: -1 } },

      //* Limitar al Top solicitado
      { $limit: limit },

      //* Cruzar con la colección uploads.files de GridFS
      {
        $lookup: {
          from: 'uploads.files',
          localField: '_id',
          foreignField: '_id',
          as: 'fileInfo',
        },
      },
      { $unwind: { path: '$fileInfo', preserveNullAndEmptyArrays: false } }, // Excluir si el archivo fue eliminado físicamente

      //* Excluir archivos que estén actualmente en la papelera
      {
        $match: {
          'fileInfo.metadata.isTrash': { $ne: true },
        },
      },

      //* Cruzar con la colección users para obtener los datos del dueño del archivo
      {
        $lookup: {
          from: 'users',
          localField: 'fileInfo.metadata.owner',
          foreignField: '_id',
          as: 'ownerInfo',
        },
      },
      { $unwind: { path: '$ownerInfo', preserveNullAndEmptyArrays: true } },

      //* Campos finales para la respuesta
      {
        $project: {
          id: '$_id',
          _id: 0,
          filename: '$fileInfo.filename',
          totalOperations: 1,
          lastActivity: 1,
          actionsPerformed: 1,
          sizeInBytes: '$fileInfo.length',
          version: { $ifNull: ['$fileInfo.metadata.version', 1] },
          owner: {
            id: '$ownerInfo._id',
            name: '$ownerInfo.name',
            email: '$ownerInfo.email',
          },
        },
      },
    ];

    const result = await this.connection.db
      ?.collection('activitylogs')
      .aggregate(pipeline)
      .toArray();

    return result || [];
  }

  async getTopUsersByFileCount(limit: number = 10) {
    const pipeline = [
      //* Omitir archivos que se encuentren en la papelera
      {
        $match: {
          'metadata.isTrash': { $ne: true },
        },
      },

      //* Agrupar por propietario 
      {
        $group: {
          _id: '$metadata.owner',
          totalFiles: { $sum: 1 },
          totalBytes: { $sum: '$length' },
        },
      },

      //* Ordenar de mayor a menor
      { $sort: { totalFiles: -1 } },

      { $limit: limit },

      //* Cruzar datos con la colección de usuarios
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

      //* Campos finales para la respuesta
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          email: '$user.email',
          avatarUrl: '$user.avatarUrl',
          isActive: '$user.isActive',
          totalFiles: 1,
          totalBytes: 1,
          totalMB: { $round: [{ $divide: ['$totalBytes', 1024 * 1024] }, 2] },
        },
      },
    ];

    const result = await this.connection.db
      ?.collection('uploads.files')
      .aggregate(pipeline)
      .toArray();

    return result || [];
  }

  async getTopUsersBySharedResources(limit: number = 10) {
    //* Contar elementos compartidos en GridFS 
    const sharedFilesPipeline = [
      {
        $match: {
          'metadata.isTrash': { $ne: true },
          'metadata.sharedWith.0': { $exists: true },
        },
      },
      {
        $project: {
          owner: '$metadata.owner',
          sharesCount: { $size: { $ifNull: ['$metadata.sharedWith', []] } },
        },
      },
      {
        $group: {
          _id: '$owner',
          sharedFilesCount: { $sum: 1 },
          totalFileSharesGranted: { $sum: '$sharesCount' },
        },
      },
    ];

    //* Contar elementos compartidos en MongoDB
    const sharedFoldersPipeline = [
      {
        $match: {
          isTrash: false,
          'sharedWith.0': { $exists: true },
        },
      },
      {
        $project: {
          owner: 1,
          sharesCount: { $size: { $ifNull: ['$sharedWith', []] } },
        },
      },
      {
        $group: {
          _id: '$owner',
          sharedFoldersCount: { $sum: 1 },
          totalFolderSharesGranted: { $sum: '$sharesCount' },
        },
      },
    ];

    const [filesShares, foldersShares] = await Promise.all([
      this.connection.db?.collection('uploads.files').aggregate(sharedFilesPipeline).toArray() || [],
      this.connection.db?.collection('folders').aggregate(sharedFoldersPipeline).toArray() || [],
    ]);

    //* Datos de usuario y data de recursos compartidos combinados
    const userMap = new Map<string, {
      userId: string;
      sharedFilesCount: number;
      sharedFoldersCount: number;
      totalResourcesShared: number;
      totalPermissionsGranted: number;
    }>();

    for (const item of filesShares) {
      const userId = item._id.toString();
      userMap.set(userId, {
        userId,
        sharedFilesCount: item.sharedFilesCount,
        sharedFoldersCount: 0,
        totalResourcesShared: item.sharedFilesCount,
        totalPermissionsGranted: item.totalFileSharesGranted,
      });
    }

    for (const item of foldersShares) {
      const userId = item._id.toString();
      const existing = userMap.get(userId);
      if (existing) {
        existing.sharedFoldersCount = item.sharedFoldersCount;
        existing.totalResourcesShared += item.sharedFoldersCount;
        existing.totalPermissionsGranted += item.totalFolderSharesGranted;
      } else {
        userMap.set(userId, {
          userId,
          sharedFilesCount: 0,
          sharedFoldersCount: item.sharedFoldersCount,
          totalResourcesShared: item.sharedFoldersCount,
          totalPermissionsGranted: item.totalFolderSharesGranted,
        });
      }
    }

    //* Ordenar por número total de recursos compartidos
    const sortedUserMetrics = Array.from(userMap.values())
      .sort((a, b) => b.totalResourcesShared - a.totalResourcesShared)
      .slice(0, limit);

    //* Obtener detalles de usuario desde la colección de usuarios
    const userObjectIds = sortedUserMetrics.map((u) => new Types.ObjectId(u.userId));
    const users = await this.connection.db
      ?.collection('users')
      .find({ _id: { $in: userObjectIds } })
      .project({ name: 1, email: 1, avatarUrl: 1, isActive: 1 })
      .toArray();

    const userDetailsMap = new Map(users?.map((u) => [u._id.toString(), u]));

    return sortedUserMetrics.map((metric) => {
      const user = userDetailsMap.get(metric.userId);
      return {
        userId: metric.userId,
        name: user?.name || 'Desconocido',
        email: user?.email || '',
        avatarUrl: user?.avatarUrl || '',
        isActive: user?.isActive ?? true,
        sharedFilesCount: metric.sharedFilesCount,
        sharedFoldersCount: metric.sharedFoldersCount,
        totalResourcesShared: metric.totalResourcesShared,
        totalPermissionsGranted: metric.totalPermissionsGranted,
      };
    });
  }

  async getTopSharedFiles(limit: number = 10, userId?: string) {
    const matchStage: Record<string, any> = {
      'metadata.isTrash': { $ne: true },
      'metadata.sharedWith.0': { $exists: true },
    };

    if (userId && Types.ObjectId.isValid(userId)) {
      matchStage['metadata.owner'] = new Types.ObjectId(userId);
    }

    const pipeline = [
      //* Filtrar archivos compartidos y activos
      { $match: matchStage },

      //* Calcular la cantidad de usuarios únicos con los que se compartió
      {
        $project: {
          _id: 1,
          filename: 1,
          length: 1,
          uploadDate: 1,
          contentType: '$metadata.contentType',
          owner: '$metadata.owner',
          version: '$metadata.version',
          sharedWithCount: { $size: { $ifNull: ['$metadata.sharedWith', []] } },
          sharedDetails: '$metadata.sharedWith',
        },
      },

      //* Ordenar de mayor a menor 
      { $sort: { sharedWithCount: -1 } },

      { $limit: limit },

      //* Cruzar datos con la colección de usuarios para obtener los datos del propietario
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'ownerInfo',
        },
      },
      { $unwind: { path: '$ownerInfo', preserveNullAndEmptyArrays: true } },

      //* Campos finales para la respuesta
      {
        $project: {
          id: '$_id',
          _id: 0,
          filename: 1,
          sharedWithCount: 1,
          sizeInBytes: '$length',
          contentType: 1,
          version: { $ifNull: ['$version', 1] },
          owner: {
            id: '$ownerInfo._id',
            name: '$ownerInfo.name',
            email: '$ownerInfo.email',
            avatarUrl: '$ownerInfo.avatarUrl',
          },
        },
      },
    ];

    const result = await this.connection.db
      ?.collection('uploads.files')
      .aggregate(pipeline)
      .toArray();

    return result || [];
  }

  async getSharedResourcesByUser(targetUserId: string) {
    const userObjectId = new Types.ObjectId(targetUserId);

    //* Obtener archivos compartidos por el usuario
    const filesPipeline = [
      {
        $match: {
          'metadata.owner': userObjectId,
          'metadata.isTrash': { $ne: true },
          'metadata.sharedWith.0': { $exists: true },
        },
      },
      {
        $project: {
          id: '$_id',
          _id: 0,
          name: '$filename',
          type: 'FILE',
          contentType: '$metadata.contentType',
          sizeInBytes: '$length',
          version: { $ifNull: ['$metadata.version', 1] },
          sharedWith: '$metadata.sharedWith',
        },
      },
      //* Cruzar con la colección users para popular los datos de las personas con quienes se compartió
      {
        $lookup: {
          from: 'users',
          localField: 'sharedWith.userId',
          foreignField: '_id',
          as: 'sharedWithUsers',
        },
      },
    ];

    //* Obtener carpetas compartidas por el usuario
    const foldersPipeline = [
      {
        $match: {
          owner: userObjectId,
          isTrash: false,
          'sharedWith.0': { $exists: true },
        },
      },
      {
        $project: {
          id: '$_id',
          _id: 0,
          name: 1,
          type: 'FOLDER',
          parentFolderId: 1,
          sharedWith: 1,
        },
      },
      //* Cruzar con la colección users
      {
        $lookup: {
          from: 'users',
          localField: 'sharedWith.userId',
          foreignField: '_id',
          as: 'sharedWithUsers',
        },
      },
    ];

    const [rawFiles, rawFolders] = await Promise.all([
      this.connection.db?.collection('uploads.files').aggregate(filesPipeline).toArray() || [],
      this.connection.db?.collection('folders').aggregate(foldersPipeline).toArray() || [],
    ]);

    //* Mapear los detalles de los usuarios con los que se compartió cada recurso
    const mapSharedWithDetails = (resource: any) => {
      //* Especificamos explícitamente el tipo de la clave y del valor del Map
      const userMap = new Map<string, UserProfile>(
        resource.sharedWithUsers?.map((u: UserProfile) =>
          [u._id.toString(), u])
      )

      const sharedDetails = resource.sharedWith.map((share: any) => {
        const u = userMap.get(share.userId.toString());
        return {
          userId: share.userId.toString(),
          name: u?.name || 'Desconocido',
          email: u?.email || '',
          avatarUrl: u?.avatarUrl || '',
          permission: share.permission,
        };
      });

      const { sharedWithUsers, ...cleanResource } = resource;
      return {
        ...cleanResource,
        sharedWith: sharedDetails,
        totalSharedWithCount: sharedDetails.length,
      };
    };

    const sharedFiles = rawFiles.map(mapSharedWithDetails);
    const sharedFolders = rawFolders.map(mapSharedWithDetails);

    //* Obtener la información del usuario emisor
    const ownerUser = await this.connection.db?.collection('users').findOne(
      { _id: userObjectId },
      { projection: { name: 1, email: 1, avatarUrl: 1, isActive: 1 } }
    );

    return {
      owner: ownerUser
        ? {
          id: ownerUser._id,
          name: ownerUser.name,
          email: ownerUser.email,
          avatarUrl: ownerUser.avatarUrl,
        }
        : null,
      summary: {
        totalSharedFiles: sharedFiles.length,
        totalSharedFolders: sharedFolders.length,
        totalSharedResources: sharedFiles.length + sharedFolders.length,
      },
      resources: {
        files: sharedFiles,
        folders: sharedFolders,
      },
    };
  }

  async getUserActivityByDateRange(targetUserId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    end.setUTCHours(23, 59, 59, 999);

    const userObjectId = new Types.ObjectId(targetUserId);

    const pipeline = [
      //* Filtrar por usuario y rango de fechas 
      {
        $match: {
          userId: userObjectId,
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },

      //* Ordenar cronológicamente (los más recientes primero)
      { $sort: { createdAt: -1 } },

      //* Cruzar con la colección de usuarios para obtener datos legibles
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },

      //* Formatear la salida del reporte
      {
        $project: {
          id: '$_id',
          _id: 0,
          action: 1,
          resourceId: 1,
          resourceType: 1,
          resourceName: 1,
          details: 1,
          createdAt: 1,
          user: {
            id: '$userInfo._id',
            name: '$userInfo.name',
            email: '$userInfo.email',
          },
        },
      },
    ];

    const logs = await this.connection.db
      ?.collection('activitylogs')
      .aggregate(pipeline)
      .toArray();

    return {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      totalActivities: logs?.length || 0,
      activities: logs || [],
    };
  }

  async getReceivedResourcesByUser(targetUserId: string) {
    const targetUserObjectId = new Types.ObjectId(targetUserId);

    //* Pipeline para Archivos Recibidos
    const filesPipeline = [
      {
        $match: {
          'metadata.isTrash': { $ne: true },
          'metadata.sharedWith.userId': targetUserObjectId,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'metadata.owner',
          foreignField: '_id',
          as: 'ownerInfo',
        },
      },
      { $unwind: { path: '$ownerInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          id: '$_id',
          _id: 0,
          name: '$filename',
          type: 'FILE',
          contentType: '$metadata.contentType',
          sizeInBytes: '$length',
          version: { $ifNull: ['$metadata.version', 1] },
          owner: {
            id: '$ownerInfo._id',
            name: '$ownerInfo.name',
            email: '$ownerInfo.email',
            avatarUrl: '$ownerInfo.avatarUrl',
          },
          //* Filtrar el arreglo para obtener únicamente el permiso del usuario objetivo
          permission: {
            $let: {
              vars: {
                userShareDetails: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$metadata.sharedWith',
                        as: 'share',
                        cond: { $eq: ['$$share.userId', targetUserObjectId] },
                      },
                    },
                    0,
                  ],
                },
              },
              in: '$$userShareDetails.permission',
            },
          },
        },
      },
    ];

    //* Pipeline para Carpetas Recibidas
    const foldersPipeline = [
      {
        $match: {
          isTrash: false,
          'sharedWith.userId': targetUserObjectId,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'ownerInfo',
        },
      },
      { $unwind: { path: '$ownerInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          id: '$_id',
          _id: 0,
          name: 1,
          type: 'FOLDER',
          parentFolderId: 1,
          owner: {
            id: '$ownerInfo._id',
            name: '$ownerInfo.name',
            email: '$ownerInfo.email',
            avatarUrl: '$ownerInfo.avatarUrl',
          },
          permission: {
            $let: {
              vars: {
                userShareDetails: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$sharedWith',
                        as: 'share',
                        cond: { $eq: ['$$share.userId', targetUserObjectId] },
                      },
                    },
                    0,
                  ],
                },
              },
              in: '$$userShareDetails.permission',
            },
          },
        },
      },
    ];

    const [receivedFiles, receivedFolders] = await Promise.all([
      this.connection.db?.collection('uploads.files').aggregate(filesPipeline).toArray() || [],
      this.connection.db?.collection('folders').aggregate(foldersPipeline).toArray() || [],
    ]);

    const targetUser = await this.connection.db?.collection('users').findOne(
      { _id: targetUserObjectId },
      { projection: { name: 1, email: 1, avatarUrl: 1 } }
    );

    return {
      receiver: targetUser
        ? {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
        }
        : null,
      summary: {
        totalReceivedFiles: receivedFiles.length,
        totalReceivedFolders: receivedFolders.length,
        totalReceivedResources: receivedFiles.length + receivedFolders.length,
      },
      resources: {
        files: receivedFiles,
        folders: receivedFolders,
      },
    };
  }

  async getOperationsSummary(startDate?: string, endDate?: string) {
    const matchStage: any = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      matchStage.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          action: '$_id',
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ];

    const operations = await this.connection.db
      ?.collection('activitylogs')
      .aggregate(pipeline)
      .toArray();

    const totalOperations = operations?.reduce((acc, curr) => acc + curr.count, 0) || 0;

    return {
      period: {
        startDate: startDate || 'Todo el histórico',
        endDate: endDate || 'Todo el histórico',
      },
      totalOperations,
      summary: operations || [],
    };
  }

  async getOperationsByPeriod(period: GroupingPeriod = GroupingPeriod.DAILY, startDate?: string, endDate?: string) {
    const matchStage: any = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      matchStage.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    //* Definir el formato de agrupación según el período solicitado
    let dateStringFormat = '%Y-%m-%d'; // Por defecto: DAILY 
    if (period === GroupingPeriod.MONTHLY) {
      dateStringFormat = '%Y-%m';
    } else if (period === GroupingPeriod.YEARLY) {
      dateStringFormat = '%Y';
    }

    const pipeline = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),


      {
        $group: {
          _id: { $dateToString: { format: dateStringFormat, date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },

      {
        $project: {
          _id: 0,
          period: '$_id',
          count: 1,
        },
      },

      { $sort: { period: 1 } },
    ];

    const operations = await this.connection.db
      ?.collection('activitylogs')
      .aggregate(pipeline)
      .toArray();

    const totalOperations = operations?.reduce((acc, curr) => acc + curr.count, 0) || 0;

    return {
      groupingPeriod: period,
      dateRange: {
        startDate: startDate || 'Todo el histórico',
        endDate: endDate || 'Todo el histórico',
      },
      totalOperations,
      summary: operations || [],
    };
  }

  async getTopSystemActions(limit: number = 5, startDate?: string, endDate?: string) {
    const matchStage: any = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      matchStage.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    const pipeline = [
      //* Se tiene la opcion de filtrar por rango de fechas
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),

      //* Ejecutar múltiples consultas en paralelo sobre los documentos filtrados
      {
        $facet: {
          //* Obtener el total absoluto de registros
          totalCount: [
            { $count: 'count' }
          ],
          //* Generar el ranking agrupando y limitando
          ranking: [
            {
              $group: {
                _id: '$action',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                action: '$_id',
                count: 1,
              },
            },
          ],
        },
      },
    ];

    const [result] = await this.connection.db
      ?.collection('activitylogs')
      .aggregate(pipeline)
      .toArray() || [];

    //* Extraer el total
    const totalOperations = result?.totalCount[0]?.count || 0;
    const ranking = result?.ranking || [];

    //* Calcular el porcentaje para cada acción del ranking
    const rankingWithPercentages = ranking.map((item: any) => ({
      ...item,
      percentage: totalOperations > 0
        ? Number(((item.count / totalOperations) * 100).toFixed(2))
        : 0,
    }));

    return {
      period: {
        startDate: startDate || 'Todo el histórico',
        endDate: endDate || 'Todo el histórico',
      },
      limitApplied: limit,
      totalOperationsInPeriod: totalOperations,
      topActions: rankingWithPercentages,
    };
  }
}