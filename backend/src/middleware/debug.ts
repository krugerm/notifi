// src/middleware/debug.ts
import { NextFunction, Request, Response } from 'express';

export const debugMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // debug.log('Incoming request:', req.method, req.url, 'Headers:', req.headers);
  next();
};

