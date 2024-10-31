// src/services/message.ts
import { dbPromise } from '../config/database';
import { Message, MessageResponse } from '../types/message';
import { debug } from '../utils/debug';
import { WebSocketService } from './websocket';

export class MessageService {
  static async getMessages(userId: number, limit: number, before?: string): Promise<MessageResponse> {
    const db = await dbPromise;
    
    let query = `
      SELECT m.*, u.email as user_email
      FROM messages m
      JOIN users u ON m.user_id = u.id
    `;
    
    const params: any[] = [];
    if (before) {
      query += ` WHERE m.timestamp < ?`;
      params.push(before);
    }
    
    query += ` ORDER BY m.timestamp DESC LIMIT ?`;
    params.push(limit + 1);

    const messages = await db.all(query, params);
    
    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;
    messagesToReturn.reverse();

    const messagesWithAttachments = await Promise.all(
      messagesToReturn.map(async (message) => {
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

    return {
      messages: messagesWithAttachments,
      hasMore,
      nextCursor: hasMore ? messages[messages.length - 1].timestamp : null
    };
  }

  static async createMessage(userId: number, body: string, files: Express.Multer.File[]): Promise<Message> {
    const db = await dbPromise;
    const timestamp = new Date().toISOString();

    await db.run("BEGIN TRANSACTION");

    try {
      const messageResult = await db.run(
        "INSERT INTO messages (user_id, body, timestamp) VALUES (?, ?, ?)",
        [userId, body, timestamp]
      );

      if (files?.length) {
        for (const file of files) {
          await db.run(
            "INSERT INTO attachments (message_id, filename, mimetype, path) VALUES (?, ?, ?, ?)",
            [messageResult.lastID, file.originalname, file.mimetype, file.filename]
          );
        }
      }

      await db.run("COMMIT");

      // Fetch the complete message
      if (!messageResult.lastID) {
        throw new Error('Failed to create message');
      }
      const message = await this.getMessageById(messageResult.lastID!);
      
      // Broadcast the new message to all connected clients
      debug.log('Broadcasting new message:', message);
      WebSocketService.broadcast(message);

      return message;
    } catch (error) {
      await db.run("ROLLBACK");
      debug.error('Error creating message:', error);
      throw error;
    }
  }

  static async getMessageById(messageId: number): Promise<Message> {
    const db = await dbPromise;
    
    const message = await db.get(
      `SELECT m.*, u.email as user_email
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = ?`,
      [messageId]
    );

    if (!message) {
      throw new Error('Message not found');
    }

    const attachments = await db.all(
      "SELECT id, filename, mimetype, path FROM attachments WHERE message_id = ?",
      [messageId]
    );

    return {
      ...message,
      attachments: attachments.map(att => ({
        ...att,
        url: `/uploads/${att.path}`,
      })),
    };
  }
}

