import { IsArray, IsNotEmpty, IsString } from 'class-validator';

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
  items: CreateDictonaryItemDto[];
}
