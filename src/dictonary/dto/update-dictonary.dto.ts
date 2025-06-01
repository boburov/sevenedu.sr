import { PartialType } from '@nestjs/mapped-types';
import { CreateDictonaryDto } from './create-dictonary.dto';

export class UpdateDictonaryDto extends PartialType(CreateDictonaryDto) {}
