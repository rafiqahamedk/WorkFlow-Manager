import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import workflowRoutes from './routes/workflow.routes.js';
import stepRoutes from './routes/step.routes.js';
import ruleRoutes from './routes/rule.routes.js';
import executionRoutes from './routes/execution.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/workflows', workflowRoutes);
app.use('/steps', stepRoutes);
app.use('/rules', ruleRoutes);
app.use('/executions', executionRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/workflow_manager';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
