// src/components/chat/JumpToBottomButton.tsx
import { ChevronDown } from 'lucide-react';

interface JumpToBottomButtonProps {
  onClick: () => void;
  unreadCount: number;
}

export const JumpToBottomButton = ({ onClick, unreadCount }: JumpToBottomButtonProps) => {
  if (unreadCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-8 bg-blue-500 text-white rounded-full p-3 shadow-lg flex items-center gap-2 hover:bg-blue-600 transition-colors"
    >
      <ChevronDown className="w-5 h-5" />
      <span className="pr-1">{unreadCount} new message{unreadCount !== 1 ? 's' : ''}</span>
    </button>
  );
};

