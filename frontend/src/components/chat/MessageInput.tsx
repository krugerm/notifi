// src/components/chat/MessageInput.tsx
import { Paperclip, Send } from 'lucide-react';
import { useRef, useState } from 'react';

interface MessageInputProps {
  onSend: (message: string, files?: FileList | null) => void;
  disabled?: boolean;
}

export const MessageInput = ({ onSend, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message.trim(), fileInputRef.current?.files);
      setMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-4 bg-white border-t">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept="image/*,application/pdf"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="p-2 text-gray-500 hover:text-gray-700"
        disabled={disabled}
      >
        <Paperclip className="w-5 h-5" />
      </button>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={1}
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={!message.trim() || disabled}
        className="p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
};