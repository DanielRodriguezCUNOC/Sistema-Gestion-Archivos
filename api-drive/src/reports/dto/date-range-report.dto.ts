import { IsDateString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';

export class DateRangeReportDto {
  @IsNotEmpty({ message: 'La fecha de inicio (startDate) es obligatoria' })
  @IsDateString({}, { message: 'startDate debe ser una fecha en formato ISO 8601 válido' })
  startDate!: string;

  @IsNotEmpty({ message: 'La fecha de fin (endDate) es obligatoria' })
  @IsDateString({}, { message: 'endDate debe ser una fecha en formato ISO 8601 válido' })
  endDate!: string;

  @IsOptional()
  @IsMongoId({ message: 'userId debe ser un Mongo ObjectId válido' })
  userId?: string;
}