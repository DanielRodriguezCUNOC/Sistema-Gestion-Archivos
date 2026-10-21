import { IsEnum, IsMongoId, IsNotEmpty } from "class-validator";
import { PermissionLevel } from "../../../files/utils/permission-level.enum.js";

export class ShareFolderDto {
  @IsNotEmpty({ message: 'El ID del usuario destino es obligatorio' })
  @IsMongoId({ message: 'El ID del usuario destino debe ser un ID de MongoDB válido' })
  targetUserId!: string;

  @IsEnum(PermissionLevel, { message: 'El nivel de permiso debe ser "read", "write" o "comment"' })
  permission!: PermissionLevel;
}