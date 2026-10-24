import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @IsBoolean({ message: 'isActive debe ser verdadero o falso' })
  isActive!: boolean;
}
