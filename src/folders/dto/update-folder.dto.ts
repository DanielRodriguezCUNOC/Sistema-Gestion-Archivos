import { PartialType } from '@nestjs/mapped-types';
import { CreateFolderDto } from './create-folder.dto.js';

export class UpdateFolderDto extends PartialType(CreateFolderDto) {}
