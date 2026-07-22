import { ArrayNotEmpty, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TestAnswerDto {
  /** Server bergan savol identifikatori: `quiz:<id>` yoki `word:<id>`. */
  @IsString()
  questionId: string;

  /** Foydalanuvchi tanlagan variant matni. */
  @IsString()
  answer: string;
}

export class SubmitCertificateTestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TestAnswerDto)
  answers: TestAnswerDto[];
}
