import { IsMongoId, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la carpeta es obligatorio' })
  name!: string;

  @IsOptional()
  @IsMongoId({ message: 'El id del padre debe ser un id de Mongo válido' })
  parentFolderId?: string;
}