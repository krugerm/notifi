// src/components/chat/ChatSettings.tsx
import { Settings } from 'lucide-react';
import { useState } from 'react';

interface ChatSettingsProps {
  batchSize: number;
  onBatchSizeChange: (size: number) => void;
}

export const ChatSettings = ({ batchSize, onBatchSizeChange }: ChatSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-full"
      >
        <Settings className="w-5 h-5" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg p-4 z-10 w-64">
          <h3 className="font-medium mb-2">Chat Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Messages per load
              </label>
              <select
                value={batchSize}
                onChange={(e) => onBatchSizeChange(Number(e.target.value))}
                className="w-full p-2 border rounded-lg"
              >
                <option value={10}>10 messages</option>
                <option value={20}>20 messages</option>
                <option value={50}>50 messages</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};