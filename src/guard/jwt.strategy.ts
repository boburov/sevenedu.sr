import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "aosdifasahuioahdajskioqeukjasdoiasdqwndiuasdj,aiudwadiuashdkjasdhaisuhdwinduqehdqhwduiqdansodanduashduihdaishdasud",
    });
  }

  async validate(payload: any) {
    if (payload?.isAdmin) {
      // Ruxsatlarni JWT dan emas, DB dan o'qiymiz — o'zgarish darhol kuchga kiradi.
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: payload.adminId },
        select: {
          id: true,
          email: true,
          role: true,
          permissions: true,
          name: true,
          surname: true,
          isActive: true,
        },
      });

      if (!admin || !admin.isActive) {
        throw new UnauthorizedException('Admin bloklangan yoki topilmadi');
      }

      return {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        name: admin.name,
        surname: admin.surname,
        isAdmin: true,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        courses: true,
        coins: true,
        name: true,
        surname: true,
        phonenumber: true,
        profilePic: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Token bekor qilindi');
    }
    return user;
  }
}
