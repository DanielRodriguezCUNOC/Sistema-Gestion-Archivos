import { IsMongoId, IsOptional } from "class-validator";

export class MoveFileDto {
  @IsOptional()
  @IsMongoId({ message: 'El ID de la carpeta debe ser un ID de MongoDB válido' })
  targetFolderId?: string | null;
}