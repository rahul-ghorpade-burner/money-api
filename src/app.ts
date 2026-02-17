import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './lib/env.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.ALLOWED_ORIGIN,
  credentials: true
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
