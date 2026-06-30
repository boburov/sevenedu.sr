// Vaqtinchalik E2E test skripti — backend Firebase send yo'lini tekshiradi.
// Sir saqlamaydi: service-account YO'LI va FCM token env orqali beriladi.
//
// Foydalanish:
//   SA=/tmp/sa.json TOKEN=<fcm_token> node .send-test-push.cjs
//
// Bu FirebaseService.sendPushNotification() bilan bir xil ish qiladi.

const admin = require('firebase-admin');

const saPath = process.env.SA;
const token = process.env.TOKEN;
const title = process.env.TITLE || 'SevenEdu — remote test';
const body = process.env.BODY || 'Backenddan kelgan haqiqiy push ✅';

if (!saPath || !token) {
  console.error('SA (service-account yo\'li) va TOKEN env shart.');
  process.exit(1);
}

const serviceAccount = require(saPath);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

admin
  .messaging()
  .send({
    token,
    notification: { title, body },
    android: { priority: 'high' },
  })
  .then((id) => {
    console.log('✅ FCM yuborildi. messageId:', id);
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ FCM xatosi:', err.code || '', err.message);
    process.exit(2);
  });
