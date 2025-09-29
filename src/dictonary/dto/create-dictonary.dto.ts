import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateDictonaryItemDto {
  @IsString()
  @IsNotEmpty()
  word: string;

  @IsString()
  @IsNotEmpty()
  translated: string;
}

export class CreateDictonaryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDictonaryItemDto)
  items: CreateDictonaryItemDto[];
}
