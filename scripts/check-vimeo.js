/**
 * Vimeo tokenini offline download uchun tekshiradi.
 *
 *   node scripts/check-vimeo.js
 *
 * Token .env dagi VIMEO_ACCESS_TOKEN dan o'qiladi — hech qachon argument
 * sifatida uzatmang (shell tarixiga tushadi).
 *
 * Uch narsani aniqlaydi:
 *   1) token scope'ida private + video_files bormi
 *   2) tarif rejasi progressive fayl beradimi (scope yetsa ham berilmasligi mumkin)
 *   3) kutubxonadagi nechta videoda download o'chiq
 */
require('dotenv').config();

const TOKEN = process.env.VIMEO_ACCESS_TOKEN;
const API = 'https://api.vimeo.com';
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.vimeo.*+json;version=3.4',
};

/** Kerakli scope'lar: birinchi ikkitasi download uchun, keyingilari admin upload uchun. */
const NEEDED = ['private', 'video_files', 'upload', 'edit'];

async function get(path) {
  const res = await fetch(`${API}${path}`, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`${path} → ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  if (!TOKEN) {
    console.error('✗ VIMEO_ACCESS_TOKEN .env da topilmadi');
    process.exit(1);
  }

  // ── 1. Scope ──────────────────────────────────────────────
  const verify = await get('/oauth/verify');
  const scopes = (verify.scope || '').split(/\s+/).filter(Boolean);
  console.log(`App: ${verify.app?.name ?? '—'}`);
  console.log(`Scope: ${scopes.join(', ') || '(bo\'sh)'}\n`);

  const missing = NEEDED.filter((s) => !scopes.includes(s));
  if (missing.length) {
    console.error(`✗ Yetishmayotgan scope: ${missing.join(', ')}`);
    console.error('  Mavjud tokenga scope qo\'shib bo\'lmaydi — yangisini generate qiling.');
    process.exit(1);
  }
  console.log('✓ Scope to\'liq\n');

  // ── 2. Tarif rejasi ───────────────────────────────────────
  const me = await get('/me?fields=name,account');
  console.log(`Akkaunt: ${me.name} — tarif: ${me.account}`);

  // ── 3. Videolarda download holati ─────────────────────────
  // files massivi bo'sh bo'lsa: scope bor, lekin tarif progressive bermayapti.
  const page = await get(
    '/me/videos?per_page=25&fields=uri,name,privacy.download,files.quality',
  );
  const videos = page.data || [];
  if (!videos.length) {
    console.log('\nKutubxonada video topilmadi.');
    return;
  }

  const noFiles = videos.filter((v) => !(v.files || []).length);
  const dlOff = videos.filter((v) => v.privacy?.download === false);

  console.log(`\nTekshirilgan video: ${videos.length} (jami ${page.total})`);
  console.log(`  progressive fayli yo'q: ${noFiles.length}`);
  console.log(`  download o'chiq:        ${dlOff.length}`);

  if (noFiles.length === videos.length) {
    console.error(
      '\n✗ Hech bir videoda progressive fayl yo\'q — bu tarif cheklovi.\n' +
        '  Offline download bu rejada ishlamaydi.',
    );
    process.exit(1);
  }

  if (dlOff.length) {
    console.log(
      '\n! Ba\'zi videolarda download o\'chiq — ularni yoqish kerak\n' +
        '  (admin paneldan yangi yuklanganlarida avtomatik yoqiladi).',
    );
    dlOff.slice(0, 10).forEach((v) => console.log(`    ${v.uri}  ${v.name}`));
  }

  console.log('\n✓ Offline download uchun Vimeo tomoni tayyor');
}

main().catch((e) => {
  console.error(`✗ ${e.message}`);
  process.exit(1);
});
