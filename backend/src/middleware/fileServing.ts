// src/middleware/fileServing.ts
import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { environment } from '../config/environment';
import { mimeTypes } from '../config/upload';
import { debug } from '../utils/debug';

export const fileServingMiddleware = (
  req: Request<any, any, any, any>,
  res: Response,
  next: NextFunction
) => {
  const requestedFile = path.basename(req.url);
  const filePath = path.join(environment.UPLOAD_DIR, requestedFile);
  
  debug.log('File request:', {
    requestUrl: req.url,
    requestedFile,
    fullPath: filePath,
    exists: fs.existsSync(filePath)
  });

  if (!filePath.startsWith(environment.UPLOAD_DIR)) {
    debug.error('Security: Attempted path traversal:', filePath);
    return res.status(403).json({ error: 'Invalid file path' });
  }

  if (!fs.existsSync(filePath)) {
    debug.error('File not found:', filePath);
    return res.status(404).json({ error: 'File not found' });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
};