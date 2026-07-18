import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from './require-permission.decorator';

/**
 * @RequirePermission('...') bilan belgilangan endpointlarni tekshiradi.
 * AdminAuthGuard'dan KEYIN ishlatilishi kerak (req.user allaqachon admin bo'lishi shart).
 * - OWNER roli => har doim o'tadi.
 * - STAFF => req.user.permissions ichida kalit bo'lishi kerak.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Ruxsat talab qilinmasa — o'tkazamiz.
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user?.isAdmin) {
      throw new ForbiddenException('Faqat admin uchun');
    }

    if (user.role === 'OWNER') return true;

    const permissions: string[] = Array.isArray(user.permissions)
      ? user.permissions
      : [];

    if (!permissions.includes(required)) {
      throw new ForbiddenException("Bu amal uchun ruxsatingiz yo'q");
    }

    return true;
  }
}
