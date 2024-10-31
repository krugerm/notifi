// src/routes/auth.ts
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { dbPromise } from '../config/database';
import { environment } from '../config/environment';
import { debug } from '../utils/debug';

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await dbPromise;

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, hashedPassword]
    );

    const token = jwt.sign({ userId: result.lastID }, environment.JWT_SECRET);
    res.json({ token, userId: result.lastID });
  } catch (error) {
    debug.error('Error registering user:', error);
    res.status(400).json({ error: "Email already registered" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await dbPromise;

    const user = await db.get(
      "SELECT id, password FROM users WHERE email = ?",
      [email]
    );

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, environment.JWT_SECRET);
    res.json({ token, userId: user.id });
  } catch (error) {
    debug.error('Error logging in:', error);
    res.status(500).json({ error: "Server error" });
  }
});

export const authRouter = router;

