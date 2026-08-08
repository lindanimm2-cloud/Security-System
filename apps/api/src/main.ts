import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:3010');
  app.enableCors({ origin: corsOrigin, credentials: true });

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  console.log(`4DS Solutions API running at http://localhost:${port}/v1`);
}

bootstrap();
