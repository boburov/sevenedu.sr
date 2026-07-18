import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GameWord {
  word: string;
  translated: string;
}

export interface QuizQuestion {
  word: string; // prompt (ingliz so'zi)
  options: string[]; // 4 ta tarjima varianti
  answerIndex: number; // to'g'ri variant indeksi
}

// Server so'z zaxirasi bo'sh bo'lsa ishlatiladigan built-in fallback.
const FALLBACK_WORDS: GameWord[] = [
  { word: 'Hello', translated: 'Salom' },
  { word: 'Water', translated: 'Suv' },
  { word: 'Friend', translated: "Do'st" },
  { word: 'Book', translated: 'Kitob' },
  { word: 'House', translated: 'Uy' },
  { word: 'Happy', translated: 'Baxtli' },
  { word: 'Brave', translated: 'Jasur' },
  { word: 'Light', translated: 'Yorug‘lik' },
  { word: 'Dream', translated: 'Orzu' },
  { word: 'Smile', translated: 'Tabassum' },
  { word: 'Garden', translated: 'Bog‘' },
  { word: 'Window', translated: 'Deraza' },
  { word: 'Orange', translated: 'Apelsin' },
  { word: 'Planet', translated: 'Sayyora' },
  { word: 'Mother', translated: 'Ona' },
  { word: 'City', translated: 'Shahar' },
  { word: 'Bread', translated: 'Non' },
  { word: 'School', translated: 'Maktab' },
  { word: 'Music', translated: 'Musiqa' },
  { word: 'River', translated: 'Daryo' },
];

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** DB lug'atidan (Dictonary) so'z zaxirasi; kam bo'lsa fallback bilan to'ldiriladi. */
  async getWordPool(limit = 120): Promise<GameWord[]> {
    const n = Math.min(Math.max(limit, 40), 400);
    let rows: GameWord[] = [];
    try {
      rows = await this.prisma.$queryRawUnsafe<GameWord[]>(
        `SELECT word, translated FROM "Dictonary"
         WHERE word <> '' AND translated <> ''
         ORDER BY random() LIMIT ${n}`,
      );
    } catch {
      rows = [];
    }

    // word bo'yicha dedupe.
    const seen = new Set<string>();
    const pool: GameWord[] = [];
    for (const r of rows) {
      const key = (r.word || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      pool.push({ word: r.word.trim(), translated: r.translated.trim() });
    }

    // Yetarli xilma-xillik uchun fallback qo'shamiz.
    if (pool.length < 8) {
      for (const w of FALLBACK_WORDS) {
        const key = w.word.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push(w);
      }
    }
    return pool;
  }

  /** Mobil o'yinlar (Word Memory / So'z o'yini) uchun tasodifiy so'zlar. */
  async getWords(count: number): Promise<GameWord[]> {
    const c = Math.min(Math.max(count || 6, 1), 30);
    const pool = await this.getWordPool();
    return this.shuffle(pool).slice(0, c);
  }

  /** Viktorina savollari — har biri 4 variantli (Duel uchun, server authoritative). */
  async buildQuiz(count: number): Promise<QuizQuestion[]> {
    const c = Math.min(Math.max(count || 5, 1), 20);
    const pool = await this.getWordPool();
    const targets = this.shuffle(pool).slice(0, c);

    return targets.map((t) => {
      const distractors = this.shuffle(
        pool.filter(
          (w) => w.translated.toLowerCase() !== t.translated.toLowerCase(),
        ),
      )
        .slice(0, 3)
        .map((w) => w.translated);
      const options = this.shuffle([t.translated, ...distractors]);
      return {
        word: t.word,
        options,
        answerIndex: options.indexOf(t.translated),
      };
    });
  }

  private async currentCoins(userId: string): Promise<number> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });
    return u?.coins ?? 0;
  }

  /** Foydalanuvchiga coins qo'shadi (server authoritative), yangi balansni qaytaradi. */
  async addCoins(userId: string, coins: number): Promise<number> {
    if (!userId || userId === 'admin' || coins <= 0) {
      return this.currentCoins(userId);
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { coins: { increment: coins } },
      select: { coins: true },
    });
    return updated.coins;
  }

  /**
   * O'yin natijasi uchun coins mukofoti. Suiiste'molni cheklash uchun har o'yin
   * bo'yicha qattiq yuqori chegara (cap) qo'yiladi.
   */
  async reward(
    userId: string,
    game: string,
    score: number,
  ): Promise<{ awarded: number; coins: number }> {
    const s = Math.max(0, Math.floor(Number(score) || 0));
    let coins = 0;
    switch (game) {
      case 'word_memory':
        coins = Math.min(s, 6);
        break;
      case 'word_quiz':
        coins = Math.min(s, 10);
        break;
      default:
        coins = Math.min(s, 10);
    }
    coins = Math.min(coins, 20); // umumiy qattiq cap
    if (coins <= 0) {
      return { awarded: 0, coins: await this.currentCoins(userId) };
    }
    const newCoins = await this.addCoins(userId, coins);
    return { awarded: coins, coins: newCoins };
  }
}
