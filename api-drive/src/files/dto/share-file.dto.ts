import { IsEnum, IsMongoId, IsNotEmpty } from "class-validator";
import { PermissionLevel } from "../utils/permission-level.enum.js";

export class ShareFileDto {

  @IsNotEmpty({ message: 'El ID del usuario destino es obligatorio' })
  @IsMongoId({ message: 'El ID del usuario destino debe ser un ID de MongoDB válido' })
  targetUserId: string;

  @IsEnum(PermissionLevel, { message: 'El nivel de permiso debe ser read, edit o comment' })
  permission!: PermissionLevel;

}
