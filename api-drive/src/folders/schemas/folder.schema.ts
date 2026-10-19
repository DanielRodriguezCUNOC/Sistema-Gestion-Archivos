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
}

export const FolderSchema = SchemaFactory.createForClass(Folder);
FolderSchema.index({ owner: 1, parentFolderId: 1 });