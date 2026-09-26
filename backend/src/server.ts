import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { checkDbHealth } from './db.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.js';
import tenantsRoutes from './routes/tenants.js';
import studentsRoutes from './routes/students.js';
import staffRoutes from './routes/staff.js';
import academicsRoutes from './routes/academics.js';
import attendanceRoutes from './routes/attendance.js';
import feesRoutes from './routes/fees.js';
import paymentsRoutes from './routes/payments.js';
import financeRoutes from './routes/finance.js';
import examsRoutes from './routes/exams.js';
import homeworkRoutes from './routes/homework.js';
import timetableRoutes from './routes/timetable.js';
import communicationRoutes from './routes/communication.js';
import auxiliaryRoutes from './routes/auxiliary.js';
import auditRoutes from './routes/audit.js';
import { config } from './config.js';

const app = express();
const PORT = config.port;

// Security & Utility Middlewares
app.use(helmet());

// Production-ready CORS: Restricts to Vercel FRONTEND_URL in production while permitting local dev
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (server-to-server, curl, health checks)
    if (!origin) return callback(null, true);

    // Development & testing mode allows localhost origins
    if (!config.isProduction) return callback(null, true);

    // Explicit wildcard if configured
    if (config.corsOrigin === '*') return callback(null, true);

    const allowedOrigins = [config.frontendUrl, config.corsOrigin].filter(Boolean) as string[];

    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed === origin) return true;
      // Allow Vercel preview/production deployments if FRONTEND_URL is on vercel.app
      if (
        (config.frontendUrl.includes('vercel.app') || config.corsOrigin.includes('vercel.app')) &&
        origin.endsWith('.vercel.app')
      ) {
        return true;
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new AppError(`Origin ${origin} not allowed by CORS policy.`, 403, 'CORS_FORBIDDEN'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Tenant-ID', 'Idempotency-Key'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestIdMiddleware);

if (config.nodeEnv !== 'test') {
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
}

// Health check endpoint
app.get('/health', async (req, res) => {
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
});

// API Routes Router (Supports both /api/v1 and /api base paths seamlessly)
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/tenants', tenantsRoutes);
apiRouter.use('/students', studentsRoutes);
apiRouter.use('/staff', staffRoutes);
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
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`EduNexus VPS Backend Service running on port ${PORT}`);
    console.log(`Health check: http://127.0.0.1:${PORT}/health`);
    console.log(`API base:     http://127.0.0.1:${PORT}/api/v1`);
    console.log(`====================================================`);
  });
}

export default app;
