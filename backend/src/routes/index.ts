// src/routes/index.ts
import { NextFunction, Request, Response, Router } from 'express';
import { fileServingMiddleware } from '../middleware/fileServing';
import { authRouter } from './auth';
import { messagesRouter } from './messages';

const router = Router();

// isalive
router.get('/isalive', (req: Request, res: Response) => {
  res.send('alive');
});

// Mount the authentication routes
router.use('/auth', authRouter);

// Mount the messages routes
router.use('/messages', messagesRouter);

// Create a sub-router for file handling
const uploadsRouter = Router();

// Add the file serving middleware to the uploads router
uploadsRouter.get('/*', (
  req: Request<any, any, any, any>,
  res: Response,
  next: NextFunction
) => fileServingMiddleware(req, res, next));

// Mount the uploads router
router.use('/uploads', uploadsRouter);

export const routes = router;