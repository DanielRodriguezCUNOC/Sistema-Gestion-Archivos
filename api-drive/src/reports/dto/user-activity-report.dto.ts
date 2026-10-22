import { IsDateString, IsNotEmpty, IsMongoId } from 'class-validator';

export class UserActivityReportDto {
  @IsNotEmpty({ message: 'El ID del usuario (userId) es obligatorio' })
  @IsMongoId({ message: 'El userId debe ser un Mongo ObjectId válido' })
  userId!: string;

  @IsNotEmpty({ message: 'La fecha de inicio (startDate) es obligatoria' })
  @IsDateString({}, { message: 'startDate debe ser formato ISO 8601' })
  startDate!: string;

  @IsNotEmpty({ message: 'La fecha de fin (endDate) es obligatoria' })
  @IsDateString({}, { message: 'endDate debe ser formato ISO 8601' })
  endDate!: string;
}