import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermission';

/**
 * Endpoint uchun zarur ruxsatni belgilaydi. Masalan: @RequirePermission('lessons.delete')
 * PermissionsGuard shu metadatani o'qib tekshiradi. OWNER roli har doim o'tadi.
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);
