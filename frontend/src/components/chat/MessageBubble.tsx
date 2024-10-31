// src/components/chat/MessageBubble.tsx
import { Message } from '@/types/chat';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}

export const MessageBubble = ({ message, isCurrentUser }: MessageBubbleProps) => {
  const bubbleClass = isCurrentUser
    ? "ml-auto bg-blue-500 text-white"
    : "mr-auto bg-gray-200 text-gray-800";

  return (
    <div className={`max-w-[80%] mb-4 ${isCurrentUser ? 'ml-auto' : 'mr-auto'}`}>
      <div className="flex flex-col">
        <span className={`text-xs mb-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
          {message.user_email}
        </span>
        <div className={`rounded-lg p-3 ${bubbleClass}`}>
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
          {message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment) => (
                <div key={attachment.id} className="rounded overflow-hidden">
                  {attachment.mimetype.startsWith('image/') ? (
                    <img
                      src={attachment.url}
                      alt={attachment.filename}
                      className="max-w-full h-auto rounded"
                    />
                  ) : (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm underline"
                    >
                      <span>📎</span>
                      <span>{attachment.filename}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <span className={`text-xs mt-1 text-gray-500 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleString()}
        </span>
      </div>
    </div>
  );
};