import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with retries and timeouts
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000, // 30 seconds
  max: 20, // Maximum pool size
});

export const db = drizzle({ client: pool, schema });