import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './platform/logger.js';
import { initDatabase } from './db/client.js';

async function bootstrap() {
  // Initialize Database connection (or fallback)
  await initDatabase();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 MarichiFleet Core API listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`📡 Healthcheck available at: http://localhost:${env.PORT}/healthz`);
    logger.info(`📦 API root mounted at: http://localhost:${env.PORT}${env.API_PREFIX}`);
  });

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error({ err, msg: 'Fatal error during server bootstrap' });
  process.exit(1);
});
