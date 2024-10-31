import { FileIcon, FileText, Image, Paperclip, Send, X } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface MessageInputHandle {
  focus: () => void;
}

interface MessageInputProps {
  onSend: (message: string, files?: FileList | null) => Promise<boolean>;
  disabled?: boolean;
  autoFocus?: boolean;
}

interface AttachmentPreview {
  file: File;
  name: string;
  size: string;
  type: string;
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(({ 
  onSend, 
  disabled,
  autoFocus 
}, ref) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    }
  }));

  // Auto focus when component mounts if autoFocus is true
  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (type.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  const addAttachments = (files: FileList) => {
    const newAttachments = Array.from(files).map(file => ({
      file,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addAttachments(e.target.files);
    }
    // Reset file input to allow selecting the same file again
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isSending) {
      setIsSending(true);
      
      // Create a new FileList-like object from the attachment files
      const fileArray = attachments.map(att => att.file);
      const fileList = new DataTransfer();
      fileArray.forEach(file => fileList.items.add(file));
      
      const success = await onSend(message.trim(), fileList.files);
      setIsSending(false);
      
      if (success) {
        setMessage('');
        setAttachments([]);
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

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files?.length) {
      addAttachments(e.dataTransfer.files);
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
              className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-sm group"
            >
              {getFileIcon(file.type)}
              <span className="truncate max-w-[150px]">{file.name}</span>
              <span className="text-gray-500 text-xs">({file.size})</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form 
        onSubmit={handleSubmit} 
        className="flex items-stretch gap-2"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
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
          className="border px-3 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center justify-center"
          disabled={disabled || isSending}
        >
          <Paperclip className="w-5 h-5 text-gray-500" />
        </button>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Type a message... ${
            navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'
          } + Enter to send`}
          className="flex-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] max-h-[150px]"
          disabled={disabled || isSending}
        />
        <button
          type="submit"
          disabled={!message.trim() || disabled || isSending}
          className="border px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
          disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center 
          justify-center"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
});