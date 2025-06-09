import { IsBoolean, IsOptional } from 'class-validator';

export class NotificationRecipientDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
