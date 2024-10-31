// src/config/environment.ts
import { config } from 'dotenv';
import path from 'path';

config();

export const environment = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  PORT: parseInt(process.env.PORT || '8000', 10),
  UPLOAD_DIR: path.resolve(__dirname, '../../uploads'),
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};

