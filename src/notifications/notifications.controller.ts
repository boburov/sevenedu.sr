import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get()
  async getAll() {
    return await this.notificationsService.getAllNotifications();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return await this.notificationsService.getNotificationById(id);
  }

  @Post()
  async create(@Body() dto: CreateNotificationDto & {
    userId?: string;
    courseId?: string;
  }) {
    const { userId, courseId, ...notificationData } = dto;

    if (userId) {
      return await this.notificationsService.createNotificationForUser(
        userId,
        notificationData,
      );
    } else if (courseId) {
      return await this.notificationsService.createNotificationForCourseUsers(
        courseId,
        notificationData,
      );
    } else {
      return await this.notificationsService.createNotification(notificationData);
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateNotificationDto>) {
    return await this.notificationsService.updateNotification(id, dto);
  }

}
