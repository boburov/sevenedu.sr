import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '2gb' }));
  app.use(urlencoded({ limit: '2gb', extended: true }));

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
