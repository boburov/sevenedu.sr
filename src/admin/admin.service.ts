import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(startOfToday.getTime() - 29 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      verifiedUsers,
      googleUsers,
      regularUsers,
      todayUsers,
      weekUsers,
      monthUsers,
      activeToday,
      activeWeek,
      totalCourses,
      totalLessons,
      totalEnrollments,
      finishedEnrollments,
      monthlySubs,
      fullChargeSubs,
      freeSubs,
      totalCertificates,
      certificatesToday,
      totalQuizzes,
      totalDictionary,
      totalSentencePuzzles,
      lessonActivityToday,
      lessonActivityWeek,
      totalActivity,
      newUsersByDayRaw,
      topCoursesRaw,
      topUsersByCoins,
      recentUsers,
      recentCertificates,
      payingUsersRaw,
      salesByCourseRaw,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.user.count({ where: { register_type: 'GOOGLE' } }),
      this.prisma.user.count({ where: { register_type: 'REGULAR' } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: startOfToday } } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
      this.prisma.coursesCategory.count(),
      this.prisma.lessons.count(),
      this.prisma.userCourse.count(),
      this.prisma.userCourse.count({ where: { isFinished: true } }),
      this.prisma.userCourse.count({ where: { subscription: 'MONTHLY' } }),
      this.prisma.userCourse.count({ where: { subscription: 'FULL_CHARGE' } }),
      this.prisma.userCourse.count({ where: { subscription: 'FREE' } }),
      this.prisma.certificate.count(),
      this.prisma.certificate.count({ where: { issuedAt: { gte: startOfToday } } }),
      this.prisma.quizs.count(),
      this.prisma.dictonary.count(),
      this.prisma.sentencePuzzle.count(),
      this.prisma.lessonActivity.count({ where: { watchedAt: { gte: startOfToday } } }),
      this.prisma.lessonActivity.count({ where: { watchedAt: { gte: sevenDaysAgo } } }),
      this.prisma.lessonActivity.count(),
      this.prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
      this.prisma.userCourse.groupBy({
        by: ['courseId'],
        _count: { courseId: true },
        orderBy: { _count: { courseId: 'desc' } },
        take: 5,
      }),
      this.prisma.user.findMany({
        orderBy: { coins: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          surname: true,
          email: true,
          coins: true,
          profilePic: true,
        },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          surname: true,
          email: true,
          createdAt: true,
          register_type: true,
          isVerified: true,
        },
      }),
      this.prisma.certificate.findMany({
        orderBy: { issuedAt: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, name: true, surname: true, email: true } },
          course: { select: { id: true, title: true } },
        },
      }),
      // Sotuvlar: pulli (FREE bo'lmagan) obunalarni sotib olgan noyob foydalanuvchilar
      this.prisma.userCourse.findMany({
        where: { subscription: { not: 'FREE' } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      // Sotuvlar: har bir kurs bo'yicha pulli obunalar (turi bilan)
      this.prisma.userCourse.groupBy({
        by: ['courseId', 'subscription'],
        where: { subscription: { not: 'FREE' } },
        _count: { courseId: true },
      }),
    ]);

    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(startOfToday.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = 0;
    }
    for (const u of newUsersByDayRaw) {
      const key = new Date(u.createdAt).toISOString().slice(0, 10);
      if (key in buckets) buckets[key] += 1;
    }
    const newUsersByDay = Object.entries(buckets).map(([date, count]) => ({
      date,
      count,
    }));

    const topCourseIds = topCoursesRaw.map((c) => c.courseId);
    const topCourseDetails = topCourseIds.length
      ? await this.prisma.coursesCategory.findMany({
          where: { id: { in: topCourseIds } },
          select: { id: true, title: true, thumbnail: true, shortName: true },
        })
      : [];
    const topCourses = topCoursesRaw.map((c) => {
      const details = topCourseDetails.find((d) => d.id === c.courseId);
      return {
        id: c.courseId,
        title: details?.title || 'Noma\'lum kurs',
        shortName: details?.shortName || '',
        thumbnail: details?.thumbnail || '',
        enrollments: c._count.courseId,
      };
    });

    // Sotuvlar: har bir kurs bo'yicha pulli obunalarni yig'amiz
    const salesCourseIds = [...new Set(salesByCourseRaw.map((s) => s.courseId))];
    const salesCourseDetails = salesCourseIds.length
      ? await this.prisma.coursesCategory.findMany({
          where: { id: { in: salesCourseIds } },
          select: { id: true, title: true, shortName: true, thumbnail: true },
        })
      : [];
    const salesMap: Record<string, { monthly: number; fullCharge: number }> = {};
    for (const row of salesByCourseRaw) {
      const entry = (salesMap[row.courseId] ??= { monthly: 0, fullCharge: 0 });
      if (row.subscription === 'MONTHLY') entry.monthly += row._count.courseId;
      else if (row.subscription === 'FULL_CHARGE')
        entry.fullCharge += row._count.courseId;
    }
    const salesByCourse = Object.entries(salesMap)
      .map(([courseId, v]) => {
        const details = salesCourseDetails.find((d) => d.id === courseId);
        return {
          id: courseId,
          title: details?.title || 'Noma\'lum kurs',
          shortName: details?.shortName || '',
          thumbnail: details?.thumbnail || '',
          monthly: v.monthly,
          fullCharge: v.fullCharge,
          total: v.monthly + v.fullCharge,
        };
      })
      .sort((a, b) => b.total - a.total);

    const completionRate = totalEnrollments
      ? Math.round((finishedEnrollments / totalEnrollments) * 100)
      : 0;
    const verificationRate = totalUsers
      ? Math.round((verifiedUsers / totalUsers) * 100)
      : 0;

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        unverified: totalUsers - verifiedUsers,
        verificationRate,
        google: googleUsers,
        regular: regularUsers,
        today: todayUsers,
        week: weekUsers,
        month: monthUsers,
        activeToday,
        activeWeek,
      },
      content: {
        courses: totalCourses,
        lessons: totalLessons,
        quizzes: totalQuizzes,
        dictionaryEntries: totalDictionary,
        sentencePuzzles: totalSentencePuzzles,
      },
      enrollments: {
        total: totalEnrollments,
        finished: finishedEnrollments,
        completionRate,
        monthly: monthlySubs,
        fullCharge: fullChargeSubs,
        free: freeSubs,
      },
      sales: {
        totalPaid: monthlySubs + fullChargeSubs,
        payingUsers: payingUsersRaw.length,
        monthly: monthlySubs,
        fullCharge: fullChargeSubs,
        byCourse: salesByCourse,
      },
      activity: {
        total: totalActivity,
        today: lessonActivityToday,
        week: lessonActivityWeek,
      },
      certificates: {
        total: totalCertificates,
        today: certificatesToday,
      },
      charts: {
        newUsersByDay,
        topCourses,
      },
      lists: {
        topUsersByCoins,
        recentUsers,
        recentCertificates,
      },
      generatedAt: now.toISOString(),
    };
  }
}
