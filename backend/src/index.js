import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.routes.js';
import workflowRoutes from './routes/workflow.routes.js';
import stepRoutes from './routes/step.routes.js';
import ruleRoutes from './routes/rule.routes.js';
import executionRoutes from './routes/execution.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { handleApprovalLink } from './controllers/approve.controller.js';

dotenv.config();

const app = express();

// CORS — allow Vercel frontend + localhost dev
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((u) => u.trim()) : []),
]);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Public auth routes
app.use('/auth', authRoutes);

// Public approval link handler (email links — no JWT needed)
app.get('/approve', handleApprovalLink);

// Protected routes
app.use('/workflows', authMiddleware, workflowRoutes);
app.use('/steps', authMiddleware, stepRoutes);
app.use('/rules', authMiddleware, ruleRoutes);
app.use('/executions', authMiddleware, executionRoutes);
app.use('/notifications', authMiddleware, notificationRoutes);

// Health check — used by keep-alive ping and uptime monitors
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/workflow_manager';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);

      // Keep-alive: ping /health every 14 minutes so Render free tier never sleeps
      if (process.env.BACKEND_URL) {
        const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes
        setInterval(async () => {
          try {
            const res = await fetch(`${process.env.BACKEND_URL}/health`);
            console.log(`[keep-alive] ping ${res.status}`);
          } catch (e) {
            console.warn('[keep-alive] ping failed:', e.message);
          }
        }, PING_INTERVAL);
        console.log(`[keep-alive] pinging ${process.env.BACKEND_URL}/health every 14 min`);
      }
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
