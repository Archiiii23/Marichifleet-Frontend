import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000'),
  JWT_SECRET: z.string().default('marichifleet-super-secret-jwt-key-change-in-production'),
  MONGODB_URI: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  SERVICE_NAME: z.string().default('core-api'),
  API_PREFIX: z.string().default('/api'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
