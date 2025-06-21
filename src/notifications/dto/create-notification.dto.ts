import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsBoolean()
  @IsOptional()
  isGlobal?: boolean;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
