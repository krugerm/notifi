// src/components/chat/MessageInput.tsx
import { Paperclip, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface MessageInputProps {
  onSend: (message: string, files?: FileList | null) => Promise<boolean>;
  disabled?: boolean;
}

interface AttachmentPreview {
  name: string;
  size: string;
}

export const MessageInput = ({ onSend, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const updateAttachments = (files: FileList | null) => {
    if (!files) {
      setAttachments([]);
      return;
    }

    const previews: AttachmentPreview[] = Array.from(files).map(file => ({
      name: file.name,
      size: formatFileSize(file.size)
    }));
    setAttachments(previews);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAttachments(e.target.files);
  };

  const clearAttachments = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setAttachments([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isSending) {
      setIsSending(true);
      let success = false;
      try {
        success = await onSend(message.trim(), fileInputRef.current?.files);
      }
      catch {
      }
      finally
      {
        setIsSending(false);
      }
      
      if (success) {
        setMessage('');
        clearAttachments();
      }
    }
  };

  // Handle Cmd/Ctrl + Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
  }, [message]);

  return (
    <div className="p-4 bg-white border-t">
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-sm"
            >
              <Paperclip className="w-4 h-4 text-gray-500" />
              <span className="truncate max-w-[150px]">{file.name}</span>
              <span className="text-gray-500 text-xs">({file.size})</span>
              <button
                type="button"
                onClick={clearAttachments}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-stretch gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center justify-center"
          disabled={disabled || isSending}
        >
          <Paperclip className="w-5 h-5 text-gray-500" />
        </button>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Cmd/Ctrl + Enter to send)"
          className="flex-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] max-h-[150px]"
          disabled={disabled || isSending}
        />
        <button
          type="submit"
          disabled={!message.trim() || disabled || isSending}
          className="px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center justify-center"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};