import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationRecipientDto } from './dto/update-ntf.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getAllNotifications() {
    return this.prisma.notification.findMany({
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
    return this.prisma.notification.findUnique({
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

    const allUsers = await this.prisma.user.findMany({ select: { id: true } });

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

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

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

    const userCourses = await this.prisma.userCourse.findMany({
      where: { courseId },
      select: { userId: true },
    });

    await this.prisma.notificationRecipient.createMany({
      data: userCourses.map(({ userId }) => ({
        userId,
        notificationId: notification.id,
      })),
      skipDuplicates: true,
    });

    return notification;
  }

  async updateNotification(notificationId: string, dto: Partial<CreateNotificationDto>) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        title: dto.title,
        message: dto.message,
        isGlobal: dto.isGlobal,
        courseId: (dto as any).courseId,
      },
    });
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
