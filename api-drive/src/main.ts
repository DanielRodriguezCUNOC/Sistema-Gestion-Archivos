import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 1. Habilitar CORS para Angular
  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });

  // 2. Prefijo global para la API
  app.setGlobalPrefix('api');

  // 3. Validación automática de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`🚀 Servidor NestJS ejecutándose en: http://localhost:${port}/api`);
}
bootstrap();