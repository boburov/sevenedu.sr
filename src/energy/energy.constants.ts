/**
 * Energiya iqtisodi — barcha narxlar shu yerda, bitta manbada.
 * Mijoz hech qachon narx yubormaydi: u faqat "sabab" (reason) beradi,
 * qancha yechilishini server hal qiladi.
 */

/** Har kuni bepul beriladigan energiya. */
export const ENERGY_DAILY_ALLOWANCE = 200;

/** Energiya sarflaydigan amallar va ularning narxi. */
export const ENERGY_COSTS = {
  /** AI'ga bitta savol (dars ichidagi chat). */
  AI_REQUEST: 10,
  /**
   * Speaking bo'limi — bitta so'z uchun emas, butun bo'lim uchun bir marta.
   * Bo'lim ichidagi so'zlarni cheksiz takrorlash mumkin.
   */
  SPEAKING_SECTION: 10,
} as const;

export type EnergySpendReason = keyof typeof ENERGY_COSTS;

/** Bitta speaking bo'limidagi so'zlar soni. */
export const SPEAKING_SECTION_SIZE = 10;

/** Do'kondagi energiya to'plamlari — tanga evaziga sotib olinadi. */
export const ENERGY_PACKS = [
  {
    id: 'energy_400',
    label: '400 energiya',
    energy: 400,
    coins: 100,
  },
] as const;

export type EnergyPack = (typeof ENERGY_PACKS)[number];
