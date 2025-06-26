import { IsArray, IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
  @IsString()
  type: 'word' | 'quiz';

  @IsNumber()
  isCorrect: number;
}

export class CreateCertificateDto {
  @IsString()
  userId: string;

  @IsString()
  courseId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
