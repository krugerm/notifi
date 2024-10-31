// src/types/message.ts
export interface Attachment {
  id: number;
  filename: string;
  mimetype: string;
  path: string;
  url: string;
}

export interface Message {
  id: number;
  user_id: number;
  user_email: string;
  body: string;
  timestamp: string;
  attachments: Attachment[];
}

export interface MessageResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}