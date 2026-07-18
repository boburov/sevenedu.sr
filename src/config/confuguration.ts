import { join } from "path";
import awsConfig from "./aws.config";

export default () => ({
 ...awsConfig(),
 // Lokal (VPS) fayl yuklash sozlamalari — yangi pfp / kurs thumbnaillari shu yerdan beriladi.
 upload: {
  // Fayllar saqlanadigan papka (server ishlayotgan VPS diskida).
  dir: process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'),
  // Saqlangan rasm uchun to'liq URL'ning bazasi (eski S3 URL'lar kabi absolyut bo'lishi uchun).
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'https://api.sevenedu.org').replace(/\/+$/, ''),
 },
 // Do'kon mahsulot rasmlari Telegram guruhda saqlanadi.
 telegram: {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID || '',
 },
});
