import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create HTTP server for logs endpoint while maintaining queue consumer
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3002;
  await app.listen(port);

  logger.log('🚀 Deploy Controller is running');
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🌐 HTTP server listening on port ${port}`);
  logger.log('📦 Waiting for deployment jobs from queue...');

  // Keep the process alive
  process.on('SIGTERM', async () => {
    logger.log('Received SIGTERM signal, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('Received SIGINT signal, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
