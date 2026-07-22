// Sertifikat shablonini tayyorlaydi: dizayner bergan SHABLON.pdf dan
// to'ldirib bo'lmaydigan "placeholder" matnlarni olib tashlaydi va o'ta katta
// (~1100 DPI) lenta rasmini 2 barobar kichraytiradi.
//
// Nega kerak: shablondagi «№ 000», «00.00.0000» va kurs nomi bo'sh qo'yilgan
// paragraf oltin/qora matn sifatida sahifaga chizilgan. Ularni ustidan
// bo'yash mumkin emas (gradientli bordo lenta ustida turibdi), shuning uchun
// PDF content stream'idan tegishli BT..ET bloklari o'chiriladi. Qolgan hamma
// narsa — ramka, medal, imzo, «SERTIFIKAT» sarlavhasi — vektor holida saqlanadi.
//
// Ishga tushirish:  node scripts/build-certificate-template.mjs
// Natija:           src/certificate/assets/sertifikat-shablon.pdf
//
// Skript idempotent: manba fayl o'zgarmaguncha natija ham bir xil bo'ladi.

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync, inflateSync } from 'zlib';
import { PDFDocument, PDFDict, PDFName, PDFRawStream, PDFNumber } from 'pdf-lib';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, '..', 'src', 'certificate', 'assets');
const SOURCE = join(ASSETS, 'sertifikat-shablon.source.pdf');
const OUTPUT = join(ASSETS, 'sertifikat-shablon.pdf');

// Sahifadagi form XObject ichida chiziladigan, o'chirilishi kerak bo'lgan
// matnlar. Har biri BT..ET blokining boshidagi `cm` matritsasi bo'yicha
// aniqlanadi — glif kodlari subset shrift bo'lgani uchun matnning o'zi bo'yicha
// qidirib bo'lmaydi. `blocks` — shu matritsadan keyingi nechta BT..ET bloki
// o'chirilishi (har bir matn qatori alohida blok).
const PLACEHOLDERS = [
  {
    // «7edu» nodavlat ta'lim muassasasida " " online kursini ... (2 qatorli paragraf)
    anchor: '3.126178 0 0 3.126178 555.69189 1433.49475 cm',
    blocks: 2,
  },
  {
    // № 000 (chap yuqori burchakdagi bordo lenta ustida, oltin rang)
    anchor: '2.1559014 -2.2638636 2.2638636 2.1559014 67.736877 294.19095 cm',
    blocks: 1,
  },
  {
    // 00.00.0000 (o'ng pastki burchakdagi bordo lenta ustida, oltin rang)
    anchor: '2.1559014 -2.2638636 2.2638636 2.1559014 3133.6567 2381.6038 cm',
    blocks: 1,
  },
];

// Lenta+medal rasmi 1267x1761 px, lekin sahifada atigi ~115x160 pt joy egallaydi
// (~1100 DPI). 2 barobar kichraytirilsa ham ~550 DPI qoladi, fayl esa ~1 MB
// yengillashadi.
const DOWNSCALE_IMAGES = [{ name: 'X24', factor: 2 }];

function findFormXObject(pdfDoc) {
  const page = pdfDoc.getPage(0);
  const resources = page.node.Resources();
  const xobjects = resources.lookup(PDFName.of('XObject'), PDFDict);
  for (const [name, ref] of xobjects.entries()) {
    const stream = pdfDoc.context.lookup(ref);
    if (stream?.dict?.lookup(PDFName.of('Subtype'))?.asString() === '/Form') {
      return { name: name.asString(), ref, stream };
    }
  }
  throw new Error('Sahifada form XObject topilmadi — shablon formati kutilganidan boshqa.');
}

/** Berilgan `cm` matritsasidan keyin keladigan birinchi BT..ET blokini o'chiradi. */
function stripTextBlock(content, anchor) {
  const at = content.indexOf(anchor);
  if (at === -1) throw new Error(`Anchor topilmadi: ${anchor}`);
  const bt = content.indexOf('BT', at);
  const et = content.indexOf('ET', bt);
  if (bt === -1 || et === -1) throw new Error(`Anchor'dan keyin BT..ET yo'q: ${anchor}`);
  return content.slice(0, bt) + content.slice(et + 2);
}

/** 8 bit/komponentli xom rasterni butun songa karrali koeffitsientda kichraytiradi. */
function downscaleRaster(data, width, height, components, factor) {
  const outW = Math.floor(width / factor);
  const outH = Math.floor(height / factor);
  const out = Buffer.alloc(outW * outH * components);
  const area = factor * factor;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      for (let c = 0; c < components; c++) {
        let sum = 0;
        for (let dy = 0; dy < factor; dy++) {
          const row = (y * factor + dy) * width;
          for (let dx = 0; dx < factor; dx++) {
            sum += data[(row + x * factor + dx) * components + c];
          }
        }
        out[(y * outW + x) * components + c] = Math.round(sum / area);
      }
    }
  }
  return { data: out, width: outW, height: outH };
}

function componentsOf(pdfDoc, imageDict) {
  const cs = imageDict.lookup(PDFName.of('ColorSpace'));
  const name = cs?.asString?.();
  if (name === '/DeviceGray') return 1;
  if (name === '/DeviceRGB') return 3;
  // [/ICCBased <ref>] — komponentlar soni oqim lug'atidagi /N da.
  const icc = cs?.get?.(1);
  const n = icc && pdfDoc.context.lookup(icc)?.dict?.lookup(PDFName.of('N'));
  if (n instanceof PDFNumber) return n.asNumber();
  throw new Error(`Noma'lum ColorSpace: ${name ?? cs}`);
}

function replaceRawStream(pdfDoc, ref, dict, bytes, { compress }) {
  const payload = compress ? deflateSync(bytes) : bytes;
  dict.set(PDFName.of('Length'), PDFNumber.of(payload.length));
  if (compress) dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'));
  else dict.delete(PDFName.of('Filter'));
  pdfDoc.context.assign(ref, PDFRawStream.of(dict, new Uint8Array(payload)));
}

function shrinkImage(pdfDoc, resources, name, factor) {
  const xobjects = resources.lookup(PDFName.of('XObject'), PDFDict);
  const ref = xobjects.get(PDFName.of(name));
  if (!ref) throw new Error(`Rasm topilmadi: ${name}`);

  // Rasm va uning shaffoflik maskasi (SMask) bir xil o'lchamda bo'lishi shart.
  const targets = [ref];
  const smask = pdfDoc.context.lookup(ref).dict.get(PDFName.of('SMask'));
  if (smask) targets.push(smask);

  for (const target of targets) {
    const stream = pdfDoc.context.lookup(target);
    const dict = stream.dict;
    const width = dict.lookup(PDFName.of('Width')).asNumber();
    const height = dict.lookup(PDFName.of('Height')).asNumber();
    const comps = componentsOf(pdfDoc, dict);
    const raw = inflateSync(Buffer.from(stream.contents));
    if (raw.length !== width * height * comps) {
      throw new Error(`${name}: kutilmagan raster hajmi (${raw.length} != ${width * height * comps})`);
    }
    const small = downscaleRaster(raw, width, height, comps, factor);
    dict.set(PDFName.of('Width'), PDFNumber.of(small.width));
    dict.set(PDFName.of('Height'), PDFNumber.of(small.height));
    replaceRawStream(pdfDoc, target, dict, small.data, { compress: true });
    console.log(`  ${name}: ${width}x${height} -> ${small.width}x${small.height}`);
  }
}

async function main() {
  const src = readFileSync(SOURCE);
  const pdfDoc = await PDFDocument.load(src);
  const form = findFormXObject(pdfDoc);

  let content = inflateSync(Buffer.from(form.stream.contents)).toString('latin1');
  const before = content.length;
  for (const { anchor, blocks } of PLACEHOLDERS) {
    for (let i = 0; i < blocks; i++) content = stripTextBlock(content, anchor);
  }
  console.log(`Placeholder matnlar o'chirildi: ${before - content.length} bayt`);

  replaceRawStream(pdfDoc, form.ref, form.stream.dict, Buffer.from(content, 'latin1'), {
    compress: true,
  });

  for (const { name, factor } of DOWNSCALE_IMAGES) {
    shrinkImage(pdfDoc, form.stream.dict.lookup(PDFName.of('Resources'), PDFDict), name, factor);
  }

  const out = await pdfDoc.save({ useObjectStreams: false });
  writeFileSync(OUTPUT, out);
  console.log(`\n${OUTPUT}`);
  console.log(`${(src.length / 1024).toFixed(0)} KB -> ${(out.length / 1024).toFixed(0)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
