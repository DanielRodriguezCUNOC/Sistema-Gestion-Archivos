import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityLog } from './schemas/activity-log.schema.js';
import { ActivityAction } from './utils/activity-action.enum.js';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityModel: Model<ActivityLog>,
  ) { }

  //* Registrar un evento en el historial
  async logEvent(
    userId: string,
    action: ActivityAction,
    resourceId: string,
    resourceType: 'FILE' | 'FOLDER',
    resourceName: string,
    details: Record<string, any> = {},
  ) {
    const log = new this.activityModel({
      userId: new Types.ObjectId(userId),
      action,
      resourceId: new Types.ObjectId(resourceId),
      resourceType,
      resourceName,
      details,
    });
    return log.save();
  }

  //* Consultar historial global o filtrado por usuario/recurso
  async getLogs(userId?: string, resourceId?: string) {
    const query: Record<string, any> = {};

    if (userId && Types.ObjectId.isValid(userId)) {
      query.userId = new Types.ObjectId(userId);
    }

    if (resourceId && Types.ObjectId.isValid(resourceId)) {
      query.resourceId = new Types.ObjectId(resourceId);
    }

    return this.activityModel
      .find(query)
      .populate('userId', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }
}