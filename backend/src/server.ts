import bcrypt from "bcryptjs";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import fs from 'fs';
import { createServer } from "http";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import WebSocket, { WebSocketServer } from "ws";
import { z } from "zod";

// Configure upload directory

// Load environment variables
config();

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Constants
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const PORT = process.env.PORT || 8000;

const UPLOAD_DIR = path.join(__dirname, '../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '';
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// restrict file types
// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//   fileFilter: (req, file, cb) => {
//     const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
//     if (allowedTypes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error("Invalid file type"));
//     }
//   },
// });

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

// Database setup
const dbPromise = open({
  filename: "./chat.db",
  driver: sqlite3.Database,
});

// Initialize database
async function initDb() {
  const db = await dbPromise;
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
}

// Schemas
const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const MessageSchema = z.object({
  body: z.string(),
});

// WebSocket connection manager
const connections = new Map<number, WebSocket>();

wss.on("connection", async (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  if (!token) {
    ws.close(1008, "Token required");
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    connections.set(payload.userId, ws);

    ws.on("close", () => {
      connections.delete(payload.userId);
    });
  } catch (error) {
    ws.close(1008, "Invalid token");
  }
});

// Authentication middleware
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.user = { id: payload.userId };
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Routes
app.post("/users/register", async (req, res) => {
  try {
    const { email, password } = UserSchema.parse(req.body);
    const db = await dbPromise;

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run("INSERT INTO users (email, password) VALUES (?, ?)", [email, hashedPassword]);
    const token = jwt.sign({ userId: result.lastID }, JWT_SECRET);
    res.json({ token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(400).json({ error: "Email already registered" });
    }
  }
});

app.post("/users/login", async (req, res) => {
  try {
    const { email, password } = UserSchema.parse(req.body);
    const db = await dbPromise;

    const user = await db.get("SELECT id, password FROM users WHERE email = ?", [email]);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});

app.post("/messages", authenticate, upload.array("attachments"), async (req, res) => {
  try {
    const { body } = MessageSchema.parse(req.body);
    const db = await dbPromise;
    const timestamp = new Date().toISOString();
    const files = req.files as Express.Multer.File[];

    // Start a transaction
    await db.run("BEGIN TRANSACTION");

    try {
      // Insert message
      const messageResult = await db.run(
        "INSERT INTO messages (user_id, body, timestamp) VALUES (?, ?, ?)",
        [req.user!.id, body, timestamp]
      );

      // Insert attachments if any
      if (files && files.length > 0) {
        for (const file of files) {
          await db.run(
            "INSERT INTO attachments (message_id, filename, mimetype, path) VALUES (?, ?, ?, ?)",
            [messageResult.lastID, file.originalname, file.mimetype, file.filename]
          );
        }
      }

      await db.run("COMMIT");

      // Fetch the complete message with user info and attachments
      const message = await db.get(
        `SELECT m.*, u.email as user_email
         FROM messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.id = ?`,
        [messageResult.lastID]
      );

      if (!message) {
        throw new Error("Message not found after insertion");
      }

      const attachments = await db.all(
        "SELECT id, filename, mimetype, path FROM attachments WHERE message_id = ?",
        [messageResult.lastID]
      );

      const completeMessage = {
        ...message,
        attachments: attachments.map(att => ({
          ...att,
          url: `/uploads/${att.path}`,
        })),
      };

      // Broadcast to all connected users
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(completeMessage));
        }
      });

      res.status(201).json(completeMessage);
    } catch (error) {
      await db.run("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error in /messages POST:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ 
        error: "Server error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  }
});

app.get("/messages", authenticate, async (req, res) => {
  try {
    const db = await dbPromise;
    const messages = await db.all(
      `SELECT m.*, u.email as user_email
       FROM messages m
       JOIN users u ON m.user_id = u.id
       ORDER BY m.timestamp DESC`
    );

    // Fetch attachments for each message
    const messagesWithAttachments = await Promise.all(
      messages.map(async (message) => {
        const attachments = await db.all(
          "SELECT id, filename, mimetype, path FROM attachments WHERE message_id = ?",
          [message.id]
        );
        return {
          ...message,
          attachments: attachments.map(att => ({
            ...att,
            url: `/uploads/${att.path}`,
          })),
        };
      })
    );

    res.json(messagesWithAttachments);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Initialize database and start server
initDb()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });

export default app;