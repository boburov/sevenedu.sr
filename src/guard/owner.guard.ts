import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Faqat OWNER roli o'ta oladi. AdminAuthGuard'dan KEYIN ishlatiladi.
 * Xodimlarni boshqarish (staff) endpointlari uchun.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.user?.isAdmin && req.user?.role === 'OWNER') return true;
    throw new ForbiddenException('Faqat egasi (owner) uchun');
  }
}
