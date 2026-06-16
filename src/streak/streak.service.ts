import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  addDays,
  differenceInCalendarDays,
  format,
} from 'date-fns';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

@Injectable()
export class StreakService {
  constructor(private prisma: PrismaService) {}

  /**
   * Foydalanuvchi biror faollik (dars yakunlash) qilganida chaqiriladi.
   * Bugun allaqachon hisoblangan bo'lsa — o'zgarmaydi.
   * Kecha bo'lgan bo'lsa — +1. Aks holda (uzilgan) — 1 dan boshlanadi.
   */
  async recordActivity(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastStreakDate: true,
        streakStartedAt: true,
      },
    });
    if (!user) return null;

    const today = startOfDay(new Date());
    const last = user.lastStreakDate
      ? startOfDay(new Date(user.lastStreakDate))
      : null;

    let currentStreak = user.currentStreak;
    let streakStartedAt = user.streakStartedAt;

    if (last) {
      const diff = differenceInCalendarDays(today, last);
      if (diff === 0) {
        // Bugun allaqachon belgilangan — yangilash shart emas
        return user;
      } else if (diff === 1) {
        currentStreak = currentStreak + 1;
      } else {
        currentStreak = 1;
        streakStartedAt = today;
      }
    } else {
      currentStreak = 1;
      streakStartedAt = today;
    }

    const longestStreak = Math.max(user.longestStreak, currentStreak);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak,
        longestStreak,
        lastStreakDate: today,
        streakStartedAt: streakStartedAt ?? today,
      },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastStreakDate: true,
        streakStartedAt: true,
      },
    });
  }

  /** Mobile streak ekrani uchun to'liq ma'lumot. */
  async getStreak(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastStreakDate: true,
        streakStartedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const now = new Date();
    const today = startOfDay(now);

    // Streak uzilgan bo'lsa (oxirgi faollik 1 kundan ko'p oldin) — joriy 0
    let currentStreak = user.currentStreak;
    if (user.lastStreakDate) {
      const diff = differenceInCalendarDays(
        today,
        startOfDay(new Date(user.lastStreakDate)),
      );
      if (diff > 1) currentStreak = 0;
    } else {
      currentStreak = 0;
    }

    // Joriy hafta (yakshanbadan boshlab) faollik kunlari
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfDay(addDays(weekStart, 6));

    const activities = await this.prisma.lessonActivity.findMany({
      where: { userId, watchedAt: { gte: weekStart, lte: weekEnd } },
      select: { watchedAt: true },
    });
    const activeDays = new Set(
      activities.map((a) => format(startOfDay(new Date(a.watchedAt)), 'yyyy-MM-dd')),
    );

    const todayKey = format(today, 'yyyy-MM-dd');
    const weekDays = Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(weekStart, i);
      const key = format(d, 'yyyy-MM-dd');
      return {
        date: key,
        weekday: WEEKDAY_LABELS[i],
        active: activeDays.has(key),
        isToday: key === todayKey,
      };
    });

    return {
      currentStreak,
      longestStreak: user.longestStreak,
      streakStartedAt: user.streakStartedAt,
      todayActive: activeDays.has(todayKey),
      weekDays,
    };
  }
}
