import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'crypto';
import { env } from './lib/env.js';
import authRoutes from './routes/authRoutes.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.ALLOWED_ORIGIN,
  credentials: true
}));
app.use(express.json());
app.use((req, _res, next) => {
  req.requestId = randomUUID();
  next();
});

// Public routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

// Error handling
app.use(errorMiddleware);

export default app;
