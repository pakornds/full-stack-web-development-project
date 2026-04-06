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
    origin: process.env.FRONTEND_URL || 'https://leaveportal.cc',
    credentials: true, // Without this CORS setting, the browser would block cookie-based cross-origin auth.
  });

  await app.listen(process.env.PORT ?? 3000);
}

try {
  await bootstrap();
} catch (error) {
  console.error(error);
}
