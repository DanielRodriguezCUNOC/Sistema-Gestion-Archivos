import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Folder extends Document {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Folder', default: null, index: true })
  parentFolderId!: Types.ObjectId | null;

  @Prop({ type: Boolean, default: false, index: true })
  isTrash!: boolean;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User' },
        permission: { type: String, enum: ['read', 'write', 'comment'] }
      }
    ],
    default: [],
  })
  sharedWith!: { userId: Types.ObjectId; permission: string }[];
}

export const FolderSchema = SchemaFactory.createForClass(Folder);
FolderSchema.index({ owner: 1, parentFolderId: 1, isTrash: 1 });
FolderSchema.index({ 'sharedWith.userId': 1 })