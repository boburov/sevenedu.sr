import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
// CommonJS modul: esModuleInterop o'chirilgani uchun `* as` bilan olinadi.
import * as fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, degrees, rgb } from 'pdf-lib';

const ASSETS = join(__dirname, 'assets');
const TEMPLATE = join(ASSETS, 'sertifikat-shablon.pdf');
const FONTS = join(ASSETS, 'fonts');

/**
 * Shablondagi matnlarning o'lchamlari va joylashuvi. Barcha son qiymatlar
 * sertifikat-shablon.pdf ning content stream'idan hisoblab olingan — shuning
 * uchun biz chizadigan matn dizayner qo'ygan placeholder'lar bilan aynan bir
 * xil joyda, bir xil kattalikda va bir xil burchakda turadi.
 *
 * Koordinatalar PDF user space'ida: (0,0) — sahifaning chap pastki burchagi,
 * y yuqoriga qarab o'sadi. Sahifa 842.25 x 604.08 pt (A4 landscape).
 */
const LAYOUT = {
  page: { width: 842.25, centerX: 421.125 },

  // Ism yoziladigan chiziqcha: baseline y = 313.46, x 136.23 dan 705.93 gacha.
  // Ism shu chiziq ustiga, markazga tekislab yoziladi.
  name: {
    y: 322,
    maxWidth: 540,
    size: 30,
    minSize: 18,
  },

  // «7edu» ... paragrafi: shablonda 15.01 pt Montserrat Italic, qatorlar orasi
  // 21 pt. Ikki qatorli matnning vizual markazi y = 234.53 da edi — qatorlar
  // soni o'zgarsa ham blok shu markaz atrofida qoladi.
  body: {
    centerY: 234.53,
    lineHeight: 21,
    size: 15.01,
    maxWidth: 560,
  },

  // Bordo lentalar ustidagi oltin matnlar. Burchak: 46.4°.
  ribbon: {
    angle: 46.4,
    size: 15.01,
    number: { x: 33.43, y: 529.75 },
    date: { x: 765.08, y: 24.39 },
  },
} as const;

const COLORS = {
  // Shablondagi bordo (SERTIFIKAT sarlavhasi va rahbar ismi bilan bir xil).
  maroon: rgb(0.3373, 0.0078, 0.0863),
  // Lentalardagi oltin.
  gold: rgb(0.8824, 0.7647, 0.251),
  body: rgb(0, 0, 0),
};

export interface CertificateData {
  /** Tartib raqami — «№ 001» ko'rinishida chiqadi. */
  number: number;
  fullName: string;
  courseTitle: string;
  issuedAt: Date;
}

/** Matn bo'lagi: bitta so'z va u chiziladigan shrift. */
interface Word {
  text: string;
  font: PDFFont;
}

@Injectable()
export class CertificatePdfService {
  private readonly logger = new Logger(CertificatePdfService.name);
  private assets?: Promise<{ template: Buffer; fonts: Record<string, Buffer> }>;

  /** Shablon va shriftlar bir marta o'qiladi, keyin xotiradan ishlatiladi. */
  private loadAssets() {
    this.assets ??= (async () => {
      const names = ['Montserrat-Italic', 'Montserrat-SemiBoldItalic', 'Montserrat-SemiBold'];
      const [template, ...files] = await Promise.all([
        readFile(TEMPLATE),
        ...names.map((n) => readFile(join(FONTS, `${n}.ttf`))),
      ]);
      const fonts = Object.fromEntries(names.map((n, i) => [n, files[i]]));
      return { template, fonts };
    })().catch((err) => {
      // Keyingi urinishda qayta o'qib ko'rilsin (masalan, deploy paytida fayl kech yetib kelgan bo'lsa).
      this.assets = undefined;
      this.logger.error(`Sertifikat shabloni o'qilmadi: ${err.message}`);
      throw err;
    });
    return this.assets;
  }

  async render(data: CertificateData): Promise<Uint8Array> {
    const { template, fonts } = await this.loadAssets();

    const pdf = await PDFDocument.load(template);
    pdf.registerFontkit(fontkit);
    const italic = await pdf.embedFont(fonts['Montserrat-Italic'], { subset: true });
    const italicBold = await pdf.embedFont(fonts['Montserrat-SemiBoldItalic'], { subset: true });
    const semibold = await pdf.embedFont(fonts['Montserrat-SemiBold'], { subset: true });

    const page = pdf.getPage(0);

    // ── Ism (chiziqcha ustida) ──
    const fullName = data.fullName.trim().replace(/\s+/g, ' ');
    const { y, maxWidth, size, minSize } = LAYOUT.name;
    const nameSize = this.fitSize(fullName, semibold, size, minSize, maxWidth);
    page.drawText(fullName, {
      x: LAYOUT.page.centerX - semibold.widthOfTextAtSize(fullName, nameSize) / 2,
      y,
      size: nameSize,
      font: semibold,
      color: COLORS.maroon,
    });

    // ── «7edu» ... paragrafi (kurs nomi qo'shtirnoq ichida, yarim qalin) ──
    this.drawParagraph(page, this.bodyWords(data.courseTitle, italic, italicBold));

    // ── Lentalardagi oltin matnlar ──
    const { angle, size: ribbonSize, number, date } = LAYOUT.ribbon;
    const rotate = degrees(angle);
    page.drawText(`№ ${String(data.number).padStart(3, '0')}`, {
      ...number,
      size: ribbonSize,
      font: italic,
      color: COLORS.gold,
      rotate,
    });
    page.drawText(this.formatDate(data.issuedAt), {
      ...date,
      size: ribbonSize,
      font: italic,
      color: COLORS.gold,
      rotate,
    });

    pdf.setTitle(`Sertifikat № ${data.number} — ${fullName}`);
    pdf.setAuthor('7edu');
    pdf.setSubject(data.courseTitle);
    pdf.setCreator('7edu');
    pdf.setProducer('7edu');

    return pdf.save();
  }

  /** Matnni berilgan enga sig'diradigan eng katta o'lchamni tanlaydi. */
  private fitSize(text: string, font: PDFFont, max: number, min: number, maxWidth: number) {
    let size = max;
    while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
    return size;
  }

  private bodyWords(courseTitle: string, italic: PDFFont, italicBold: PDFFont): Word[] {
    const course = courseTitle.trim().replace(/\s+/g, ' ');
    const words: Word[] = [];
    const plain = (s: string) => s.split(' ').forEach((t) => words.push({ text: t, font: italic }));

    plain('«7edu» nodavlat ta’lim muassasasida');
    // Kurs nomi qo'shtirnoq ichida — birinchi va oxirgi so'zga tirnoq yopishtiriladi,
    // shunda qator ko'chganda ham tirnoq nomdan ajralib qolmaydi.
    const parts = course.split(' ');
    parts.forEach((t, i) => {
      const text = `${i === 0 ? '“' : ''}${t}${i === parts.length - 1 ? '”' : ''}`;
      words.push({ text, font: italicBold });
    });
    plain('online kursini muvaffaqiyatli yakunlagani uchun ushbu sertifikat bilan taqdirlanadi');

    return words;
  }

  /** So'zlarni qatorlarga bo'lib, har birini markazga tekislab chizadi. */
  private drawParagraph(page: ReturnType<PDFDocument['getPage']>, words: Word[]) {
    const { centerY, lineHeight, size, maxWidth } = LAYOUT.body;
    const widthOf = (line: Word[]) =>
      line.reduce((w, word, i) => w + word.font.widthOfTextAtSize((i ? ' ' : '') + word.text, size), 0);

    const lines: Word[][] = [];
    for (const word of words) {
      const current = lines[lines.length - 1];
      if (current && widthOf([...current, word]) <= maxWidth) current.push(word);
      else lines.push([word]);
    }

    // Blokni o'zining vertikal markazi bo'yicha joylashtiramiz, shunda kurs nomi
    // uzun bo'lib qator qo'shilsa ham matn dizayndagi joyida qoladi.
    let y = centerY + ((lines.length - 1) * lineHeight) / 2;
    for (const line of lines) {
      let x = LAYOUT.page.centerX - widthOf(line) / 2;
      line.forEach((word, i) => {
        const text = (i ? ' ' : '') + word.text;
        page.drawText(text, { x, y, size, font: word.font, color: COLORS.body });
        x += word.font.widthOfTextAtSize(text, size);
      });
      y -= lineHeight;
    }
  }

  /** Shablondagi «00.00.0000» formati. */
  private formatDate(date: Date) {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(date.getDate())}.${p(date.getMonth() + 1)}.${date.getFullYear()}`;
  }
}
