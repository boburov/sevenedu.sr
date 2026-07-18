import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  UpdateStaffPasswordDto,
} from './dto/staff.dto';
import {
  PERMISSION_RESOURCES,
  sanitizePermissions,
} from '../auth/permissions';

// Parolsiz xavfsiz select
const SAFE_SELECT = {
  id: true,
  name: true,
  surname: true,
  email: true,
  role: true,
  permissions: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  permissionsCatalog() {
    return PERMISSION_RESOURCES;
  }

  findAll() {
    return this.prisma.adminUser.findMany({
      select: SAFE_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const staff = await this.prisma.adminUser.findUnique({
      where: { id },
      select: SAFE_SELECT,
    });
    if (!staff) throw new NotFoundException('Xodim topilmadi');
    return staff;
  }

  async create(dto: CreateStaffDto) {
    const email = dto.email.trim().toLowerCase();

    const exists = await this.prisma.adminUser.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Bu email allaqachon mavjud');

    const role = dto.role === 'OWNER' ? 'OWNER' : 'STAFF';
    // OWNER hamma ruxsatga ega — permissions ni bo'sh saqlaymiz.
    const permissions =
      role === 'OWNER' ? [] : sanitizePermissions(dto.permissions);

    const hashed = await bcrypt.hash(dto.password, 10);

    return this.prisma.adminUser.create({
      data: {
        name: dto.name.trim(),
        surname: dto.surname?.trim() || null,
        email,
        password: hashed,
        role,
        permissions,
        isActive: true,
      },
      select: SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdateStaffDto, requesterId: string) {
    const target = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Xodim topilmadi');

    // Owner o'zining OWNER rolini yoki faolligini o'zi olib tashlamasin (lock-out oldini olish)
    if (id === requesterId) {
      if (dto.role && dto.role !== 'OWNER') {
        throw new BadRequestException("O'z rolingizni o'zgartira olmaysiz");
      }
      if (dto.isActive === false) {
        throw new BadRequestException("O'zingizni bloklay olmaysiz");
      }
    }

    // Oxirgi owner boshqasiga aylantirilmasin
    if (target.role === 'OWNER' && dto.role && dto.role !== 'OWNER') {
      const ownerCount = await this.prisma.adminUser.count({
        where: { role: 'OWNER', isActive: true },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException("Oxirgi owner'ni o'zgartirib bo'lmaydi");
      }
    }

    const nextRole = dto.role ?? target.role;
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.surname !== undefined) data.surname = dto.surname?.trim() || null;
    if (dto.role !== undefined) data.role = nextRole;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.permissions !== undefined) {
      data.permissions =
        nextRole === 'OWNER' ? [] : sanitizePermissions(dto.permissions);
    } else if (dto.role === 'OWNER') {
      data.permissions = [];
    }

    return this.prisma.adminUser.update({
      where: { id },
      data,
      select: SAFE_SELECT,
    });
  }

  async updatePassword(id: string, dto: UpdateStaffPasswordDto) {
    const target = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Xodim topilmadi');

    const hashed = await bcrypt.hash(dto.password, 10);
    await this.prisma.adminUser.update({
      where: { id },
      data: { password: hashed },
    });
    return { success: true };
  }

  async remove(id: string, requesterId: string) {
    const target = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Xodim topilmadi');

    if (id === requesterId) {
      throw new BadRequestException("O'zingizni o'chira olmaysiz");
    }

    if (target.role === 'OWNER') {
      const ownerCount = await this.prisma.adminUser.count({
        where: { role: 'OWNER', isActive: true },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException("Oxirgi owner'ni o'chirib bo'lmaydi");
      }
    }

    await this.prisma.adminUser.delete({ where: { id } });
    return { success: true };
  }
}
