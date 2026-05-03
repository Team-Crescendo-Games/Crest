/**
 * Centralized application configuration.
 *
 * Reads and validates all environment variables at import time.
 * Required variables throw a descriptive error if missing;
 * optional variables fall back to sensible defaults.
 */

export interface AppConfig {
  database: {
    url: string;
  };
  auth: {
    secret: string;
    url: string;
    allowedEmails: string[];
  };
  s3: {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
    publicUrl?: string;
  };
  stage: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` + `Set it in your .env file or deployment configuration.`,
    );
  }
  return value;
}

function parseAllowedEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Build & validate config at import time
// ---------------------------------------------------------------------------

export const config: AppConfig = {
  database: {
    url: requireEnv("DATABASE_URL"),
  },
  auth: {
    secret: requireEnv("AUTH_SECRET"),
    url: requireEnv("AUTH_URL"),
    allowedEmails: parseAllowedEmails(process.env.ALLOWED_EMAILS),
  },
  s3: {
    region: process.env.S3_REGION ?? "us-east-1",
    bucket: process.env.S3_BUCKET ?? "crest-attachments",
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    endpoint: process.env.S3_ENDPOINT,
    publicUrl: process.env.S3_PUBLIC_URL,
  },
  stage: process.env.STAGE ?? process.env.NODE_ENV ?? "development",
};
