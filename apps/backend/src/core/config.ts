import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { z } from 'zod';

// Load .env file programmatically (no dotenv required)
(function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let val = trimmed.slice(index + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
})();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid configuration:", parsed.error.format());
  process.exit(1);
}

export const config = {
  DATABASE_URL: parsed.data.DATABASE_URL,
  PORT: parsed.data.PORT,
  JWT_SECRET: parsed.data.JWT_SECRET || (function() {
    console.warn("[SECURITY WARNING] Generating ephemeral JWT_SECRET. Session state is not persistent.");
    return crypto.randomBytes(32).toString('hex');
  })()
};
