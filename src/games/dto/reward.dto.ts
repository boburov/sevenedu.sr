import { IsInt, IsString, Max, Min } from 'class-validator';

export class RewardDto {
  // 'word_memory' | 'word_quiz'
  @IsString()
  game: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  score: number;
}
