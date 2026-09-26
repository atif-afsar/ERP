import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  isProduction: boolean;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  frontendUrl: string;
  corsOrigin: string;
  logLevel: string;
}

const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
const isProduction = nodeEnv === 'production';

// In production, ensure secrets are not left empty or default
const defaultDevSecret = 'dev_secret_only_replace_with_secure_random_in_production';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : defaultDevSecret);

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === defaultDevSecret)) {
  console.warn(
    '\x1b[33m%s\x1b[0m',
    '[SECURITY ALERT] JWT_SECRET is not configured for production. Please define JWT_SECRET in your VPS .env file.'
  );
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  isProduction,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: (process.env.FRONTEND_URL || '').replace(/\/$/, ''),
  corsOrigin: process.env.CORS_ORIGIN || '',
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;
