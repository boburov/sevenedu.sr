import { IsBoolean, IsString } from "class-validator";

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsBoolean()
  isGlobal?: boolean;

  @IsString()
  courseId?: string;
}
