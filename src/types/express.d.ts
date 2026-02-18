declare global {
  namespace Express {
    interface Request {
      /** Defined on protected routes after authMiddleware verifies the JWT */
      userId?: string;
      /** Set by the requestId middleware on every incoming request */
      requestId?: string;
    }
  }
}

export {};
