import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityLog } from './schemas/activity-log.schema.js';
import { ActivityAction } from './utils/activity-action.enum.js';

export interface ActivityEntry {
  userId: string;
  action: ActivityAction;
  resourceId: string;
  resourceType: ActivityResourceType;
  resourceName: string;
  details?: Record<string, any>;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityModel: Model<ActivityLog>,
  ) { }

  //* Registrar un evento en el historial
  async logEvent(
    userId: string,
    action: ActivityAction,
    resourceId: string,
    resourceType: ActivityResourceType,
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

  async tryLogEvent(
    userId: string,
    action: ActivityAction,
    resourceId: string,
    resourceType: ActivityResourceType,
    resourceName: string,
    details: Record<string, any> = {},
  ): Promise<void> {
    try {
      await this.logEvent(userId, action, resourceId, resourceType, resourceName, details);
    } catch (error: any) {
      this.logger.error(`No se pudo registrar ${action} sobre ${resourceId}: ${error.message}`);
    }
  }

  //* Registro masivo (cascadas de carpetas): un solo insertMany en lugar de N escrituras
  async tryLogEvents(entries: ActivityEntry[]): Promise<void> {
    if (entries.length === 0) return;

    try {
      await this.activityModel.insertMany(
        entries.map((e) => ({
          userId: new Types.ObjectId(e.userId),
          action: e.action,
          resourceId: new Types.ObjectId(e.resourceId),
          resourceType: e.resourceType,
          resourceName: e.resourceName,
          details: e.details ?? {},
        })),
      );
    } catch (error: any) {
      this.logger.error(`No se pudieron registrar ${entries.length} eventos: ${error.message}`);
    }
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