import { IsNotEmpty, IsMongoId } from 'class-validator';

export class UserSharedResourcesDto {
  @IsNotEmpty({ message: 'El ID del usuario (userId) es obligatorio' })
  @IsMongoId({ message: 'El userId debe ser un ObjectId de Mongo válido' })
  userId!: string;
}