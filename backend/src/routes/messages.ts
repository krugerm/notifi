// src/routes/messages.ts
import { Router } from 'express';
import { upload } from '../config/upload';
import { authenticate } from '../middleware/auth';
import { MessageService } from '../services/message';
import { debug } from '../utils/debug';

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const before = req.query.before as string;

    const response = await MessageService.getMessages(req.user!.id, limit, before);
    res.json(response);
  } catch (error) {
    debug.error('Error fetching messages:', error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", authenticate, upload.array("attachments"), async (req, res) => {
  try {
    const { body } = req.body;
    const files = req.files as Express.Multer.File[];
    
    const message = await MessageService.createMessage(req.user!.id, body, files);
    res.status(201).json(message);
  } catch (error) {
    debug.error('Error creating message:', error);
    res.status(500).json({ error: "Server error" });
  }
});

export const messagesRouter = router;

