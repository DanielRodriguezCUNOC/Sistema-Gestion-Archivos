import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RenameFolderDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la carpeta es obligatorio' })
  @MaxLength(120, { message: 'El nombre de la carpeta no puede superar 120 caracteres' })
  name!: string;
}
