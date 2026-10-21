
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class UpdateFileContentDto {
  @IsString()
  content!: string;

  @IsNumber()
  @IsNotEmpty({ message: 'La versión del archivo es obligatoria para el control de concurrencia' })
  version!: number; // La versión que el usuario tenía abierta
}