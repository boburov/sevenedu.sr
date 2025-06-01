import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryCourseDto } from './create-course-category.dto';

export class UpdateCourseDto extends PartialType(CreateCategoryCourseDto) { }
