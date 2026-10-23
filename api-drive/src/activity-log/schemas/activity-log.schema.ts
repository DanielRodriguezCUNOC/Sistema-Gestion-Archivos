import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";
import { ActivityAction } from "../utils/activity-action.enum.js";

@Schema({ timestamps: true })
export class ActivityLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: Object.values(ActivityAction), index: true })
  action!: ActivityAction;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  resourceId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['FILE', 'FOLDER'] })
  resourceType!: 'FILE' | 'FOLDER';

  @Prop({ required: true })
  resourceName!: string;

  @Prop({ type: Object, default: {} })
  details!: Record<string, any>;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ resourceId: 1, createdAt: -1 });