import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || typeof value !== 'string' || value === 'undefined' || value === 'null' || !Types.ObjectId.isValid(value)) {
      throw new BadRequestException('ID no válido');
    }
    return value;
  }
}
