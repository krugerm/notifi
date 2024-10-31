// src/server.ts
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { dbPromise } from './config/database';
import { environment } from './config/environment';
import { debugMiddleware } from './middleware/debug';
import { routes } from './routes';
import { WebSocketService } from './services/websocket';
import { debug } from './utils/debug';

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Initialize WebSocket service
WebSocketService.initialize(wss);

// Middleware
app.use(cors());
app.use(express.json());
app.use(debugMiddleware);

// Routes
app.use('/', routes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  debug.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    // Ensure database is initialized
    await dbPromise;
    
    httpServer.listen(environment.PORT, () => {
      debug.log(`Server running on port ${environment.PORT}`);
      debug.log('Server configuration:', {
        uploadDir: environment.UPLOAD_DIR,
        maxFileSize: environment.MAX_FILE_SIZE,
      });
    });
  } catch (error) {
    debug.error('Failed to start server:', error);
    process.exit(1);
  }
};
const gracefulShutdown = () => {
  debug.log('Received shutdown signal');
  WebSocketService.shutdown();
  httpServer.close(() => {
    debug.log('Server shut down completely');
    process.exit(0);
  });
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer();

export default app;
