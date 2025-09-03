import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      // Hamma domainni ruxsat qilamiz
      callback(null, origin || '*');
    },
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const server = await app.listen(30066);
  server.setTimeout(1000 * 60 * 50); // 50 minut timeout
}
bootstrap();
