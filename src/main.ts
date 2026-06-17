import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(json({ limit: '2gb' }));
  app.use(urlencoded({ limit: '2gb', extended: true }));

  // Yuklangan rasmlar (pfp / kurs thumbnail) VPS diskidan beriladi: /uploads/...
  const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
    maxAge: '7d',
  });

  app.enableCors({
    origin: (origin, callback) => {
      callback(null, origin || '*');
    },
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const server = await app.listen(30066);
  server.setTimeout(1000 * 60 * 50);
}
bootstrap();
