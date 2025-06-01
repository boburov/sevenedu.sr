import { PartialType } from '@nestjs/mapped-types';
import { CreateQuessionDto } from './create-quession.dto';

export class UpdateQuessionDto extends PartialType(CreateQuessionDto) {}
