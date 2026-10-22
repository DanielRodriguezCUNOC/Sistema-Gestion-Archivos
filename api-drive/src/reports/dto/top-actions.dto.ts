import { IsDateString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class TopActionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo es 1' })
  @Max(50, { message: 'El límite máximo es 50' })
  limit?: number = 5;

  @IsOptional()
  @IsDateString({}, { message: 'startDate debe ser formato ISO 8601' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate debe ser formato ISO 8601' })
  endDate?: string;
}