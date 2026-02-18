import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: ['amount', 'label', 'monthly_income', 'savings_percentage'],
    remove: true,
  },
  base: {
    env: process.env.NODE_ENV,
  }
});
