import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';

const logger = pino();
const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
