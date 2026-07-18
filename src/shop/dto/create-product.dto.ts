import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // multipart/form-data orqali keladi → string; service Number() qiladi.
  @IsNumberString()
  price: string;
}
