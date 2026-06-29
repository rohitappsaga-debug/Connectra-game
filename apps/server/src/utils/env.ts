import { z } from 'zod';

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value.trim();
}

function getEnvInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Invalid integer for env var ${key}: ${raw}`);
  return parsed;
}

export const env = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: getEnvInt('PORT', 3001),
  corsOrigin: getEnv('CORS_ORIGIN', 'http://localhost:5173'),
  databaseUrl: getEnv('DATABASE_URL'),
  logLevel: getEnv('LOG_LEVEL', 'info'),

  room: {
    codeLength: getEnvInt('ROOM_CODE_LENGTH', 6),
    expirationMinutes: getEnvInt('ROOM_EXPIRATION_MINUTES', 30),
    maxPlayers: getEnvInt('ROOM_MAX_PLAYERS', 2),
  },

  reconnect: {
    tokenTtlMinutes: getEnvInt('RECONNECT_TOKEN_TTL_MINUTES', 5),
  },
} as const;

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
});
