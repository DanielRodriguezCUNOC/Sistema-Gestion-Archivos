import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Role } from "../enums/role.enum.js";

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;
  @Prop({ required: true })
  password: string;
  @Prop({ required: true, enum: Role, default: Role.USER })
  role: Role;
}

export const UserSchema = SchemaFactory.createForClass(User);