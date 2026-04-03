import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationRecipientDto } from './dto/update-ntf.dto';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService) { }
  private readonly logger = new Logger(NotificationsService.name);

  @Cron('0 16 * * *')
  async handleDailyReminder() {
    this.logger.log('⏰ 16:00 — Dars ko‘rmagan foydalanuvchilar aniqlanmoqda...');
    await this.notifyUsersInactiveToday();
    await this.notifyUsersInactiveForAWeek();
  }

  async saveUserFcmToken(userId: string, fcmToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
  }

  async notifyUsersInactiveToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const activeUserIds = await this.prisma.lessonActivity.findMany({
      where: { watchedAt: { gte: today, lt: tomorrow } },
      select: { userId: true },
      distinct: ['userId'],
    });

    const activeIds = activeUserIds.map((u) => u.userId);

    const inactiveUsers = await this.prisma.user.findMany({
      where: { id: { notIn: activeIds } },
    });

    for (const user of inactiveUsers) {
      await this.createNotificationForUser(user.id, {
        title: 'Eslatma!',
        message: 'Bugun hali hech qanday dars ko‘rmadingiz. Faolligingizni tiklang!',
      });
    }

    this.logger.log(`📩 ${inactiveUsers.length} ta userga bugungi eslatma yuborildi.`);
  }

  async notifyUsersInactiveForAWeek() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeUserIds = await this.prisma.lessonActivity.findMany({
      where: { watchedAt: { gte: sevenDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    });

    const activeIds = activeUserIds.map((u) => u.userId);

    const inactiveUsers = await this.prisma.user.findMany({
      where: { id: { notIn: activeIds } },
    });

    for (const user of inactiveUsers) {
      await this.createNotificationForUser(user.id, {
        title: '1 hafta davomida dars ko‘rilmadi!',
        message: 'Siz 1 haftadan beri darslarimizni ko‘rmayapsiz. Faollikni tiklang!',
      });
    }

    this.logger.log(`📅 ${inactiveUsers.length} ta userga 7 kunlik eslatma yuborildi.`);
  }

  async getAllNotifications() {
    return this.prisma.notification.findMany({
      include: { recipients: true, readBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNotificationById(id: string) {
    return this.prisma.notification.findUnique({
      where: { id },
      include: { recipients: true, readBy: true },
    });
  }

  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        title: dto.title,
        message: dto.message,
        isGlobal: dto.isGlobal,
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

  async createNotificationForUser(userId: string, data: { title: string; message: string }) {
    const notification = await this.prisma.notification.create({
      data: { title: data.title, message: data.message, isGlobal: false },
    });

    await this.prisma.notificationRecipient.create({
      data: { userId, notificationId: notification.id },
    });

    // YANGI: push notification yuborish
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.fcmToken) {
      await this.firebaseService.sendPushNotification(
        user.fcmToken,
        data.title,
        data.message,
      );
    }

    return notification;
  }
  
  async createNotificationForCourseUsers(courseId: string, dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        title: dto.title,
        message: dto.message,
        isGlobal: dto.isGlobal,
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

  async updateNotification(id: string, dto: Partial<CreateNotificationDto>) {
    return this.prisma.notification.update({
      where: { id },
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
          createdAt: { lt: oneMonthAgo },
        },
      },
    });

    await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: oneMonthAgo },
        recipients: { none: {} },
      },
    });

    this.logger.log('🗑️ 1 oydan oshgan notificationlar tozalandi.');
  }
}
