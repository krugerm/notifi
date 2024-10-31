// src/types/chat.ts
export interface Message {
    id: number;
    body: string;
    timestamp: string;
    user_id: number;
    user_email: string;
    attachments: Array<{
      id: number;
      filename: string;
      mimetype: string;
      url: string;
    }>;
  }
  
  export interface AlertState {
    message: string;
    type: "default" | "info" | "success" | "error";
  }