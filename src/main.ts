import './polyfills';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma.service';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const prismaService = app.get(PrismaService);
  // Run migrations in non-production environments
  if (configService.get('NODE_ENV') !== 'development') {
    try {
      await prismaService.$executeRaw`SELECT 1`; // Test DB connection
      const { execSync } = require('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('Migrations ran successfully');
    } catch (error) {
      console.error('Error running migrations:', error);
    }
  }

  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:8080', // Replace with your frontend's URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Include cookies or credentials if needed
  });

  app.use(cookieParser());

  await app.listen(3000);
}
bootstrap();
