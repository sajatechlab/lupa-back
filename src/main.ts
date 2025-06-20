import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getQueueToken } from '@nestjs/bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: [
      'https://lupa-ia.com',
      'https://www.lupa-ia.com',
      'http://localhost:8080',
      'https://testing.lupa-ia.com',
      'https://www.testing.lupa-ia.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Set-Cookie', '*'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  // Add this before app.listen
  // app.use((req, res, next) => {
  //   const origin = req.headers.origin;
  //   if (
  //     origin &&
  //     [
  //       'https://lupa-ia.com',
  //       'https://www.lupa-ia.com',
  //       'http://localhost:8080',
  //     ].indexOf(origin) !== -1
  //   ) {
  //     res.setHeader('Access-Control-Allow-Origin', origin);
  //     res.setHeader('Access-Control-Allow-Credentials', 'true');
  //     res.setHeader(
  //       'Access-Control-Allow-Methods',
  //       'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  //     );
  //     res.setHeader(
  //       'Access-Control-Allow-Headers',
  //       'Content-Type, Accept, Authorization',
  //     );
  //   }
  //   next();
  // });

  // Enable cookie parser
  app.use(cookieParser());

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('The NestJS API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Bull-board setup
  const sentInvoicesQueue = app.get(getQueueToken('sent-invoices'));
  const receivedInvoicesQueue = app.get(getQueueToken('received-invoices'));
  const zipGenerationQueue = app.get(getQueueToken('zip-generation'));
  const zipFileProcessingQueue = app.get(getQueueToken('zip-file-processing'));

  const serverAdapter = new ExpressAdapter();
  createBullBoard({
    queues: [
      new BullAdapter(sentInvoicesQueue),
      new BullAdapter(receivedInvoicesQueue),
      new BullAdapter(zipGenerationQueue),
      new BullAdapter(zipFileProcessingQueue),
    ],
    serverAdapter,
  });
  serverAdapter.setBasePath('/admin/queues');
  app.use('/admin/queues', serverAdapter.getRouter());

  const port = process.env.PORT || 3000;
  // Listen on all interfaces (0.0.0.0)
  await app.listen(port, '0.0.0.0');
  // Add this log
  console.log('Redis URL:', process.env.REDIS_URL);

  console.log(`Application is running on port ${port}`);
}
bootstrap();
