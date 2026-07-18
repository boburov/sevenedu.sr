/**
 * Ruxsat katalogi — admin panel bo'limlari va amallari uchun yagona manba.
 * Kalit formati: `resource.action` (masalan "lessons.delete").
 * OWNER roli barcha ruxsatlarni avtomatik oladi (bypass).
 */

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface PermissionResource {
  key: string; // resurs kaliti (masalan "lessons")
  label: string; // UI da ko'rinadigan nom (o'zbekcha)
  actions: PermissionAction[]; // shu resurs uchun mavjud amallar
}

export const PERMISSION_RESOURCES: PermissionResource[] = [
  { key: 'courses', label: 'Kurslar (kategoriya)', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'lessons', label: 'Darslar', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'shop', label: "Do'kon", actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'movies', label: 'Kinolar', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'users', label: 'Foydalanuvchilar', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'dictionary', label: "Lug'at", actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'quiz', label: 'Testlar', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'sentencePuzzle', label: "Savollar (jumboq)", actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'notifications', label: 'Bildirishnoma / SMS', actions: ['view', 'create'] },
  { key: 'enrollment', label: "O'quvchiga kurs biriktirish", actions: ['view', 'create', 'delete'] },
];

/** Barcha mumkin bo'lgan ruxsat kalitlari ro'yxati (validatsiya uchun). */
export const ALL_PERMISSIONS: string[] = PERMISSION_RESOURCES.flatMap((r) =>
  r.actions.map((a) => `${r.key}.${a}`),
);

/** Berilgan kalit(lar) katalogda mavjudligini tekshiradi. */
export function isValidPermission(key: string): boolean {
  return ALL_PERMISSIONS.includes(key);
}

/** Faqat katalogda mavjud bo'lgan ruxsatlarni qaytaradi (noto'g'rilarini filtrlaydi). */
export function sanitizePermissions(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  return Array.from(new Set(keys.filter((k): k is string => typeof k === 'string' && isValidPermission(k))));
}
