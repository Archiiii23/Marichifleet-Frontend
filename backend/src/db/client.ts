import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../platform/logger.js';
import { seedMongoDatabase } from './seeds/mongoSeeder.js';

let isMongoConnected = false;
let activeMongoUri = '';
let mongoServerInstance: any = null;

export function sanitizeMongoUri(rawUri: string): string {
  try {
    const protocolMatch = rawUri.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/);
    if (!protocolMatch) return rawUri;
    const protocol = protocolMatch[1];
    const rest = protocolMatch[2];
    const lastAtIndex = rest.lastIndexOf('@');
    if (lastAtIndex === -1) return rawUri;
    const creds = rest.substring(0, lastAtIndex);
    const hostAndQuery = rest.substring(lastAtIndex + 1);
    const colonIndex = creds.indexOf(':');
    if (colonIndex === -1) return rawUri;
    const user = creds.substring(0, colonIndex);
    const pass = creds.substring(colonIndex + 1);
    const encodedUser = encodeURIComponent(decodeURIComponent(user));
    const encodedPass = encodeURIComponent(decodeURIComponent(pass));
    return `${protocol}${encodedUser}:${encodedPass}@${hostAndQuery}`;
  } catch {
    return rawUri;
  }
}

export async function initDatabase(): Promise<boolean> {
  // 1. First attempt connecting to user-provided or local MONGODB_URI
  if (env.MONGODB_URI) {
    const targetUri = sanitizeMongoUri(env.MONGODB_URI);
    try {
      await mongoose.connect(targetUri, {
        serverSelectionTimeoutMS: 5000,
      });
      isMongoConnected = true;
      activeMongoUri = targetUri;
      logger.info(' Connected to MongoDB at ' + targetUri.replace(/\/\/.*@/, '//***@'));
      await seedMongoDatabase();
      return true;
    } catch (error) {
      logger.warn(
        ` Remote/Local MongoDB connection failed (${(error as Error).message}). Bootstrapping in-process MongoDB engine...`
      );
    }
  }

  // 2. Fallback: Automatically start real MongoDB in-process engine via MongoMemoryServer
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoServerInstance = await MongoMemoryServer.create();
    const memUri = mongoServerInstance.getUri();
    await mongoose.connect(memUri);
    isMongoConnected = true;
    activeMongoUri = memUri;
    logger.info(' Real MongoDB engine initialized and connected at ' + memUri);
    await seedMongoDatabase();
    return true;
  } catch (err) {
    logger.error({ err, msg: ' Failed to start MongoDB engine.' });
    isMongoConnected = false;
    return false;
  }
}

export function getDatabaseStatus() {
  return {
    isMongoConnected,
    mode: 'mongodb',
    uri: activeMongoUri ? activeMongoUri.replace(/\/\/.*@/, '//***@') : 'not-connected',
  };
}
