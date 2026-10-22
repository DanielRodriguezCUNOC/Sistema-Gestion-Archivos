import { IsOptional, IsInt, Min, Max, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class TopActiveFilesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo es 1' })
  @Max(50, { message: 'El límite máximo es 50' })
  limit?: number = 10;

  @IsOptional()
  @IsMongoId({ message: 'userId debe ser un Mongo ObjectId válido' })
  userId?: string;
}