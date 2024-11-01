// src/config/upload.ts
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { debug } from '../utils/debug';
import { environment } from './environment';

// Ensure upload directory exists
if (!fs.existsSync(environment.UPLOAD_DIR)) {
  fs.mkdirSync(environment.UPLOAD_DIR, { recursive: true });
  debug.log('Created upload directory:', environment.UPLOAD_DIR);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, environment.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: environment.MAX_FILE_SIZE }
});

export const mimeTypes: { [key: string]: string } = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain'
};
