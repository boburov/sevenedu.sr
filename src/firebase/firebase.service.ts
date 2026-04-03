import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }

  async sendPushNotification(fcmToken: string, title: string, body: string) {
    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        android: { priority: 'high' },
      });
    } catch (error) {
      // Token eskirgan bo'lishi mumkin — o'chirib tashlang
      console.error(`FCM yuborishda xato [${fcmToken}]:`, error.message);
    }
  }

  async sendPushToMany(fcmTokens: string[], title: string, body: string) {
    const validTokens = fcmTokens.filter(Boolean);
    if (!validTokens.length) return;

    await admin.messaging().sendEachForMulticast({
      tokens: validTokens,
      notification: { title, body },
      android: { priority: 'high' },
    });
  }
}