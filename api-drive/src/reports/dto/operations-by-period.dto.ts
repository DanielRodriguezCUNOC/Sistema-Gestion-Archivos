import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { GroupingPeriod } from '../utils/grouping-period.enum.js';

export class OperationsByPeriodDto {
  @IsOptional()
  @IsEnum(GroupingPeriod, { message: 'period debe ser DAILY, MONTHLY o YEARLY' })
  period?: GroupingPeriod = GroupingPeriod.DAILY;

  @IsOptional()
  @IsDateString({}, { message: 'startDate debe ser formato ISO 8601' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate debe ser formato ISO 8601' })
  endDate?: string;
}