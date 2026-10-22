import { IsNotEmpty, IsMongoId } from 'class-validator';

export class UserReceivedResourcesDto {
  @IsNotEmpty({ message: 'El ID del usuario receptor (userId) es obligatorio' })
  @IsMongoId({ message: 'El userId debe ser un Mongo ObjectId válido' })
  userId!: string;
}