import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { UserRole } from "../utils/user-role.enum.js";

@Schema({ timestamps: true })
export class User extends Document {

  @Prop({
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    index: true,
  })
  name!: string

  @Prop({
    required: true,
    unique: [true, 'El email debe ser único'],
    lowercase: true,
    trim: true,
    index: true
  })
  email!: string

  @Prop({
    required: [true, 'La contraseña es obligatoria'],
  })
  password!: string

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
  })
  role!: UserRole

  @Prop({
    type: Boolean,
    default: true,
    index: true
  })
  isActive!: boolean

  @Prop({
    type: String,
    default: function (this: User) {
      //* Generar avatar automáticamente
      const seed = encodeURIComponent(this.name || 'User')
      return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`
    }
  })
  avatarUrl!: string
}

export const UserSchema = SchemaFactory.createForClass(User)

UserSchema.index({ name: 'text', email: 'text' })