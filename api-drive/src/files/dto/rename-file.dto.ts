import { IsNotEmpty, IsString } from "class-validator";

export class RenameFileDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del archivo no puede estar vacío' })
  filename!: string
}