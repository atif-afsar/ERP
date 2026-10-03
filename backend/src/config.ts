import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.string().url().refine(v => /^postgres(ql)?:/.test(v), 'Use a PostgreSQL URL'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('1h'),
  JWT_ISSUER: z.string().min(1).default('edunexus-api'),
  JWT_AUDIENCE: z.string().min(1).default('edunexus-web'),
  FRONTEND_URL: z.string().url(),
  CORS_ORIGIN: z.string().default(''),
  LOG_LEVEL: z.string().default('info'),
  APP_PUBLIC_URL: z.string().url().optional(),
  EMAIL_DELIVERY_MODE: z.enum(['LOG', 'LIVE']).default('LOG'),
  EMAIL_PROVIDER: z.enum(['RESEND']).default('RESEND'),
  EMAIL_FROM_NAME: z.string().min(1).default('EduNexus'),
  EMAIL_FROM_ADDRESS: z.string().email().default('notifications@example.invalid'),
  RESEND_API_KEY: z.string().optional(),
  NOTIFICATION_POLL_MS: z.coerce.number().int().min(250).max(60000).default(5000),
  RAZORPAY_KEY_ID: z.string().default('rzp_test_mock'),
  RAZORPAY_KEY_SECRET: z.string().default('rzp_secret_mock'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('rzp_webhook_mock'),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error('Invalid environment: ' + parsed.error.issues.map(i => i.path.join('.') + ': ' + i.message).join('; '));
}
const env = parsed.data;
if (env.NODE_ENV === 'production' && env.EMAIL_DELIVERY_MODE !== 'LIVE') throw new Error('Production requires EMAIL_DELIVERY_MODE=LIVE.');
if (env.EMAIL_DELIVERY_MODE === 'LIVE' && !env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is required for live email delivery.');
if (env.EMAIL_DELIVERY_MODE === 'LIVE' && env.EMAIL_FROM_ADDRESS.endsWith('.invalid')) throw new Error('A verified EMAIL_FROM_ADDRESS is required for live email delivery.');
const origins = [env.FRONTEND_URL, ...env.CORS_ORIGIN.split(',').filter(Boolean)].map(v => {
  const url = new URL(v.trim());
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('CORS origins must contain only scheme and host.');
  if (env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('Production frontend origins must use HTTPS.');
  return url.origin;
});
if (env.NODE_ENV === 'production' && /change|replace|example|dev_secret/i.test(env.JWT_SECRET)) throw new Error('Replace the example JWT secret before production startup.');
export const config = {
  port: env.PORT, nodeEnv: env.NODE_ENV, isProduction: env.NODE_ENV === 'production',
  databaseUrl: env.DATABASE_URL, jwtSecret: env.JWT_SECRET, jwtExpiresIn: env.JWT_EXPIRES_IN,
  jwtIssuer: env.JWT_ISSUER, jwtAudience: env.JWT_AUDIENCE,
  frontendUrl: new URL(env.FRONTEND_URL).origin, corsOrigin: env.CORS_ORIGIN, allowedOrigins: origins,
  logLevel: env.LOG_LEVEL,
  appPublicUrl: new URL(env.APP_PUBLIC_URL || env.FRONTEND_URL).origin,
  emailDeliveryMode: env.EMAIL_DELIVERY_MODE,
  emailProvider: env.EMAIL_PROVIDER,
  emailFromName: env.EMAIL_FROM_NAME,
  emailFromAddress: env.EMAIL_FROM_ADDRESS,
  resendApiKey: env.RESEND_API_KEY,
  notificationPollMs: env.NOTIFICATION_POLL_MS,
  razorpayKeyId: env.RAZORPAY_KEY_ID,
  razorpayKeySecret: env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
};
export type AppConfig = typeof config;
export default config;
