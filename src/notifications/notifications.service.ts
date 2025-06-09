import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationRecipientDto } from './dto/update-ntf.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) { }

  async getAllNotifications() {
    return await this.prisma.notification.findMany({
      include: {
        recipients: true,
        readBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getNotificationById(id: string) {
    return await this.prisma.notification.findUnique({
      where: { id },
      include: {
        recipients: true,
        readBy: true,
      },
    });
  }

  async createNotification(dto: CreateNotificationDto) {
    const { title, message, isGlobal } = dto;

    const notification = await this.prisma.notification.create({
      data: {
        title,
        message,
        isGlobal,
      },
    });

    const allUsers = await this.prisma.user.findMany({
      select: { id: true },
    });

    await this.prisma.notificationRecipient.createMany({
      data: allUsers.map((user) => ({
        userId: user.id,
        notificationId: notification.id,
      })),
      skipDuplicates: true,
    });

    return notification;
  }

  async createNotificationForUser(userId: string, dto: CreateNotificationDto) {
    const { title, message, isGlobal } = dto;

    const notification = await this.prisma.notification.create({
      data: {
        title,
        message,
        isGlobal,
      },
    });

    await this.prisma.notificationRecipient.create({
      data: {
        userId,
        notificationId: notification.id,
      },
    });

    return notification;
  }

  async createNotificationForCourseUsers(courseId: string, dto: CreateNotificationDto) {
    const { title, message, isGlobal } = dto;

    const notification = await this.prisma.notification.create({
      data: {
        title,
        message,
        isGlobal,
        courseId,
      },
    });

    // Kursni sotib olgan userlarni topamiz (bu yerda courses array dan tekshirish misoli)
    const usersInCourse = await this.prisma.user.findMany({
      where: {
        courses: {
          has: courseId,
        },
      },
      select: {
        id: true,
      },
    });

    await this.prisma.notificationRecipient.createMany({
      data: usersInCourse.map((user) => ({
        userId: user.id,
        notificationId: notification.id,
      })),
      skipDuplicates: true,
    });

    return notification;
  }

  async updateNotification(notificationId: string, dto: Partial<CreateNotificationDto>) {
    const updateData: any = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.message !== undefined) updateData.message = dto.message;
    if (dto.isGlobal !== undefined) updateData.isGlobal = dto.isGlobal;
    if ((dto as any).courseId !== undefined) updateData.courseId = (dto as any).courseId;

    const updatedNotification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: updateData,
    });

    return updatedNotification;
  }

  async updateNotificationRecipient(id: string, dto: Partial<NotificationRecipientDto>) {
    return this.prisma.notificationRecipient.update({
      where: { id },
      data: dto,
    });
  }


  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async deleteOldNotifications() {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    await this.prisma.notificationRecipient.deleteMany({
      where: {
        notification: {
          createdAt: {
            lt: oneMonthAgo,
          },
        },
      },
    });

    await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: oneMonthAgo,
        },
        recipients: {
          none: {},
        },
      },
    });

    console.log('📦 1 oydan oshgan eski notificationlar o‘chirildi.');
  }
}

