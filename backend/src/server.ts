import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { checkDbHealth, pool } from './db.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.js';
import tenantsRoutes from './routes/tenants.js';
import studentsRoutes from './routes/studentLifecycle.js';
import staffRoutes from './routes/academicOperations.js';
import hrRoutes from './routes/hrOperations.js';
import libraryRoutes from './routes/libraryOperations.js';
import inventoryRoutes from './routes/inventoryOperations.js';
import transportRoutes from './routes/transportOperations.js';
import hostelRoutes from './routes/hostelOperations.js';
import messRoutes from './routes/messOperations.js';
import academicsRoutes from './routes/academics.js';
import attendanceRoutes from './routes/attendanceOperations.js';
import feesRoutes from './routes/feeManagement.js';
import paymentsRoutes from './routes/manualPaymentsOnly.js';
import financeRoutes from './routes/finance.js';
import examsRoutes from './routes/examinationOperations.js';
import homeworkRoutes from './routes/homework.js';
import timetableRoutes from './routes/timetableOperations.js';
import communicationRoutes from './routes/communication.js';
import notificationRoutes from './routes/notifications.js';
import auxiliaryRoutes from './routes/auxiliary.js';
import auditRoutes from './routes/audit.js';
import organizationRoutes from './routes/organization.js';
import masterDataRoutes from './routes/masterData.js';
import billingRoutes from './routes/billing.js';
import adminBillingRoutes from './routes/adminBilling.js';
import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';
import { businessAccess } from './middleware/businessAccess.js';
import { enforceSubscription } from './middleware/enforceSubscription.js';

import { globalLimiter } from './middleware/rateLimiter.js';

const app = express();
const PORT = config.port;

// Trust reverse proxy for accurate IP resolution for rate limiting
app.set('trust proxy', 1);

// Security & Utility Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      frameSrc: ["'self'", "https://checkout.razorpay.com"],
      connectSrc: ["'self'", "https://api.razorpay.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Prevents issues with external checkout frames
}));
app.use(globalLimiter);

// Production-ready CORS: Restricts to Vercel FRONTEND_URL in production while permitting local dev
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
    callback(new AppError('Origin not allowed.', 403, 'CORS_FORBIDDEN'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Tenant-ID', 'Idempotency-Key'],
};

app.use(cors(corsOptions));
app.use(express.json({ 
  limit: '2mb',
  verify: (req: any, res, buf) => {
    if (req.originalUrl.includes('/webhooks/razorpay')) {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(requestIdMiddleware);

if (config.nodeEnv !== 'test') {
  app.use(morgan((tokens, req, res) => {
    return JSON.stringify({
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: Number(tokens.status(req, res)),
      content_length: tokens.res(req, res, 'content-length'),
      response_time_ms: Number(tokens['response-time'](req, res)),
      remote_addr: tokens['remote-addr'](req, res),
      tenant_id: (req as any).tenantId || req.headers['x-tenant-id'] || null,
      request_id: (req as any).id || req.headers['x-request-id'] || null,
      timestamp: new Date().toISOString()
    });
  }));
}

// Health check handler
const healthHandler: express.RequestHandler = async (req, res) => {
  const dbHealth = await checkDbHealth();
  const isHealthy = dbHealth.ok;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    api: true,
    database: {
      connected: dbHealth.ok,
      latencyMs: dbHealth.latencyMs,
      error: dbHealth.error || null,
    },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
};

app.get('/health', healthHandler);
app.get('/readiness', healthHandler);

// API Routes Router (Supports both /api/v1 and /api base paths seamlessly)
const apiRouter = express.Router();
apiRouter.get('/health', healthHandler);
apiRouter.get('/readiness', healthHandler);
apiRouter.use('/auth', authRoutes);

// SaaS Billing Routes
apiRouter.use('/billing', billingRoutes);
apiRouter.use('/admin/billing', adminBillingRoutes);

// Own notification shell remains available during subscription recovery.
apiRouter.use('/notifications', requireAuth, notificationRoutes);
apiRouter.use(requireAuth, businessAccess);

apiRouter.use(enforceSubscription);

apiRouter.use('/tenants', tenantsRoutes);
apiRouter.use('/students', studentsRoutes);
apiRouter.use('/staff', staffRoutes);
apiRouter.use('/hr', hrRoutes);
apiRouter.use('/library', libraryRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/transport', transportRoutes);
apiRouter.use('/hostel', hostelRoutes);
apiRouter.use('/mess', messRoutes);
apiRouter.use('/academics', academicsRoutes);
apiRouter.use('/attendance', attendanceRoutes);
apiRouter.use('/fees', feesRoutes);
apiRouter.use('/payments', paymentsRoutes);
apiRouter.use('/finance', financeRoutes);
apiRouter.use('/exams', examsRoutes);
apiRouter.use('/homework', homeworkRoutes);
apiRouter.use('/timetable', timetableRoutes);
apiRouter.use('/communication', communicationRoutes);
apiRouter.use('/audit', auditRoutes);
apiRouter.use('/organization', organizationRoutes);
apiRouter.use('/master-data', masterDataRoutes);
apiRouter.use('/', auxiliaryRoutes);

app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);

// Catch-all 404 handler
app.use((req, res, next) => {
  next(new AppError(`Endpoint ${req.method} ${req.originalUrl} not found.`, 404, 'NOT_FOUND'));
});

// Centralized error handler
app.use(errorHandler);


if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`EduNexus VPS Backend Service running on port ${PORT}`);
    console.log(`Health check: http://127.0.0.1:${PORT}/health`);
    console.log(`API base:     http://127.0.0.1:${PORT}/api/v1`);
    console.log(`====================================================`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await pool.end();
        console.log('PostgreSQL pool closed.');
        process.exit(0);
      } catch (err) {
        console.error('Error during PostgreSQL pool closure:', err);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;
