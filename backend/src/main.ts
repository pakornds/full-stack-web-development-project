import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Setup cookie parser
  app.use(cookieParser());

  // Setup global validation pipeline for DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Setup CORS to allow cross-origin requests with credentials (cookies)
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
