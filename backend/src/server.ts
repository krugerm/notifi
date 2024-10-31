import bcrypt from "bcryptjs";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { WebSocketServer } from "ws";
import { z } from "zod";

// Load environment variables
config();

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Constants
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPromise = open({
  filename: "./notifi.db",
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
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT,
      body TEXT,
      timestamp TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
}

// Schemas
const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const NotificationSchema = z.object({
  title: z.string(),
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

app.post("/users/reset-password-request", async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const db = await dbPromise;

    const resetToken = crypto.randomBytes(32).toString("hex");
    await db.run("UPDATE users SET reset_token = ? WHERE email = ?", [resetToken, email]);

    // In production, send email with reset token
    res.json({ message: "If an account exists, a reset email has been sent" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});

app.post("/users/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = z
      .object({
        token: z.string(),
        newPassword: z.string().min(6),
      })
      .parse(req.body);

    const db = await dbPromise;
    const user = await db.get("SELECT id FROM users WHERE reset_token = ?", [token]);

    if (!user) {
      return res.status(400).json({ error: "Invalid token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE users SET password = ?, reset_token = NULL WHERE id = ?", [hashedPassword, user.id]);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});

app.post("/notifications", authenticate, async (req, res) => {
  try {
    const { title, body } = NotificationSchema.parse(req.body);
    const db = await dbPromise;
    const timestamp = new Date().toISOString();

    const result = await db.run("INSERT INTO notifications (user_id, title, body, timestamp) VALUES (?, ?, ?, ?)", [
      req.user!.id,
      title,
      body,
      timestamp,
    ]);

    const notification = {
      id: result.lastID,
      title,
      body,
      timestamp,
    };

    // Send real-time notification via WebSocket
    const ws = connections.get(req.user!.id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(notification));
    }

    res.json({ notificationId: result.lastID });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});

app.get("/notifications", authenticate, async (req, res) => {
  try {
    const db = await dbPromise;
    const notifications = await db.all(
      `SELECT id, title, body, timestamp 
       FROM notifications 
       WHERE user_id = ? 
       ORDER BY timestamp DESC`,
      [req.user!.id]
    );
    res.json(notifications);
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
