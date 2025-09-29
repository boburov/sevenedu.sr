import { IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class DictonaryItemDto {
  @IsString()
  word: string;

  @IsString()
  translated: string;
}

export class CreateDictonaryDto {
  @ValidateNested({ each: true })
  @Type(() => DictonaryItemDto)
  items: DictonaryItemDto[] | DictonaryItemDto;
}
