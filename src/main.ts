import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true, bodyParser: false });


  app.use(bodyParser.json({ limit: '4000mb' }));
  app.use(bodyParser.urlencoded({ limit: '4000mb', extended: true }));


  app.enableCors({
    origin: ['http://localhost:3000', 'https://sevenedu.store'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  });


  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));


  const server = await app.listen(process.env.PORT ?? 3000);
  server.setTimeout(1000 * 60 * 50);
}
bootstrap();
