import { IsDateString, IsOptional } from 'class-validator';

export class OperationsSummaryDto {
  @IsOptional()
  @IsDateString({}, { message: 'startDate debe ser formato ISO 8601' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate debe ser formato ISO 8601' })
  endDate?: string;
}