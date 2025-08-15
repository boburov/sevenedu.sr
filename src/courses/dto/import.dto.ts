// src/courses/dto/import-courses.dto.ts
export class ImportCoursesDto {
  courses: {
    id: string;
    title: string;
    shortName: string;
    thumbnail: string;
    goal: string;
    lessons: {
      id: string;
      title: string;
      isDemo: boolean;
      videoUrl: string;
      order: number;
    }[];
  }[];
}