import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './utils/env.js';
import { logger } from './utils/logger.js';
import { prisma } from './lib/prisma.js';
import { healthRoutes, userRoutes, roomRoutes, inviteRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler, requestLogger, corsMiddleware, securityHeaders } from './middleware/index.js';
import { setupSocketHandlers } from './sockets/index.js';
import { warmupDb } from './lib/prisma.js';
import { roomService } from './services/room.service.js';
import { reconnectService } from './services/reconnect.service.js';
import { inviteService } from './services/invite.service.js';
import { gameService } from './services/game.service.js';

const app = express();
app.set('trust proxy', 1);

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
  connectionStateRecovery: {},
});

app.use(helmet());
app.use(compression());
app.use(corsMiddleware);
app.use(securityHeaders);
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.use('/api/health', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/invites', inviteRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

setupSocketHandlers(io);

await warmupDb();

const cleanupIntervalId = setInterval(async () => {
  try {
    await roomService.expireRooms();
    await reconnectService.cleanup();
    await inviteService.cleanup();
    gameService.cleanupAbandonedGames();
  } catch (error) {
    logger.error('Cleanup job failed', { error });
  }
}, 5 * 60 * 1000);

server.listen(env.port, () => {
  logger.info(`Server running on port ${env.port}`, {
    environment: env.nodeEnv,
    corsOrigin: env.corsOrigin,
  });
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  clearInterval(cleanupIntervalId);
  
  // Set a shutdown watchdog timeout (10 seconds)
  const forceShutdownTimeout = setTimeout(() => {
    logger.warn('Graceful shutdown timed out, force quitting');
    process.exit(1);
  }, 10000);

  try {
    // 1. Close Socket.IO server
    io.close(() => {
      logger.info('Socket.IO connections closed');
    });

    // 2. Close HTTP server
    await new Promise<void>((resolve) => {
      server.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
    });

    // 3. Disconnect Prisma client
    await prisma.$disconnect();
    logger.info('Database client disconnected');

    clearTimeout(forceShutdownTimeout);
    logger.info('Graceful shutdown completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

export { app, server, io };
