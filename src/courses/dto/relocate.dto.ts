// dto/relocate-lessons.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LessonOrderDto {
  @ApiProperty({
    description: 'Dars IDsi',
    example: '3365eabc-6346-4567-bd98-9c72b2b9901f'
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Darsning yangi tartib raqami',
    example: 3
  })
  @IsNumber()
  @IsNotEmpty()
  order: number;
}

export class RelocateLessonsDto {
  @ApiProperty({
    description: 'Darslar va ularning yangi tartiblari',
    type: [LessonOrderDto],
    example: [
      { id: '3365eabc-6346-4567-bd98-9c72b2b9901f', order: 3 },
      { id: '0b387355-98ed-487c-bf85-9f231d9791d6', order: 1 },
      { id: '3ba2c668-e507-4a1e-8058-00462999d5a1', order: 2 }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonOrderDto)
  lessons: LessonOrderDto[];
}