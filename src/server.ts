import { env } from './lib/env.js';
import app from './app.js';
import pino from 'pino';

const logger = pino();

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});
