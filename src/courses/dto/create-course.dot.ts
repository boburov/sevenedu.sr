import { Transform } from "class-transformer"
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator"

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export class CreateLessonDto {
  @IsString()
  title: string

  @IsString()
  videoUrl: string

  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;  // ← bu qator yo'q edi!
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isDemo: boolean

  @IsOptional()
  @IsString()
  @IsIn(CEFR_LEVELS as unknown as string[])
  level?: string

  @IsOptional()
  quzis?: []
}
