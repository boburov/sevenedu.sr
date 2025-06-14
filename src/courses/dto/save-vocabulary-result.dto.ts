import { IsInt, Min } from 'class-validator';

export class SaveVocabularyResultDto {
  @IsInt()
  @Min(0)
  correct: number;

  @IsInt()
  @Min(0)
  wrong: number;
}
