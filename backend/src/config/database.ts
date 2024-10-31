// src/config/database.ts
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { debug } from '../utils/debug';

export const initializeDatabase = async () => {
  const db = await open({
    filename: './chat.db',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      reset_token TEXT
    );
    
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      body TEXT,
      timestamp TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER,
      filename TEXT,
      mimetype TEXT,
      path TEXT,
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
    );
  `);

  debug.log('Database initialized');
  return db;
};

export const dbPromise = initializeDatabase();

