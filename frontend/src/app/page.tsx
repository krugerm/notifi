// src/app/page.tsx
"use client";

import { ChatSettings } from '@/components/chat/ChatSettings';
import { DateSeparator } from '@/components/chat/DateSeparator';
import { JumpToBottomButton } from '@/components/chat/JumpToBottomButton';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput, MessageInputHandle } from '@/components/chat/MessageInput';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { debug } from '@/utils/debug';
import { Loader2, LogOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface Message {
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

interface MessageResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}

interface AlertState {
  message: string;
  type: "default" | "info" | "success" | "error";
}

const SERVER_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [token, setToken] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<number | null>(null);
  const [batchSize, setBatchSize] = useState<number>(20);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNearBottom, setIsNearBottom] = useState<boolean>(true);

  const [connectionInfo, setConnectionInfo] = useState<{
    connected: boolean;
    deviceId: string;
    browserInfo: BrowserInfo | null;
  }>({
    connected: false,
    deviceId: '',
    browserInfo: null
  });

  // Refs for DOM elements and state tracking
  const messagesContainerReference = useRef<HTMLDivElement>(null);
  const messagesEndReference = useRef<HTMLDivElement>(null);
  const lastReadTimestampReference = useRef<string | null>(null);
  const messageInputRef = useRef<MessageInputHandle>(null);

  const { isConnected, deviceId, browserInfo, reconnect } = useWebSocket(token, {
    onMessage: (message) => {
      // debug.log('Received message:', message);
      setMessages(prev => [...prev, message]);
      
      if (!isNearBottom) {
        setUnreadCount(prev => prev + 1);
      } else {
        lastReadTimestampReference.current = message.timestamp;
      }
    },
    onConnectionChange: (connected) => {
      setConnectionInfo(prev => ({
        ...prev,
        connected
      }));
    }
  });

  const showAlert = (message: string, type: AlertState['type'] = 'info'): void => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const areDatesOnDifferentDays = (firstDate: string | undefined, secondDate: string | undefined): boolean => {
    if (!firstDate || !secondDate) return true;
    return new Date(firstDate).toDateString() !== new Date(secondDate).toDateString();
  };

  const scrollToBottom = useCallback((scrollBehavior: ScrollBehavior = 'smooth'): void => {
    if (!messagesEndReference.current) return;
    
    try {
      messagesEndReference.current.scrollIntoView({ behavior: scrollBehavior });
      setUnreadCount(0);
      if (messages.length > 0) {
        lastReadTimestampReference.current = messages[messages.length - 1].timestamp;
      }
    } catch (error) {
      debug.error('Error scrolling to bottom:', error);
    }
  }, [messages]);

  const handleScroll = useCallback((): void => {
    const container = messagesContainerReference.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isCloseToBottom = distanceFromBottom < 100;
    setIsNearBottom(isCloseToBottom);

    if (isCloseToBottom) {
      setUnreadCount(0);
      lastReadTimestampReference.current = messages && messages.length > 0 ? messages[messages.length - 1]?.timestamp ?? null : null;
    }

    const isCloseToTop = container.scrollTop < 100;
    if (isCloseToTop && !isLoadingMore && hasMore && nextCursor) {
      setIsLoadingMore(true);
      const currentScrollHeight = container.scrollHeight;
      
      fetchMessages(token, nextCursor, batchSize).then(() => {
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - currentScrollHeight;
          }
        });
        setIsLoadingMore(false);
      });
    }
  }, [isLoadingMore, hasMore, nextCursor, token, messages, batchSize]);

  const fetchMessages = async (authenticationToken: string, cursor?: string, limit: number = batchSize): Promise<void> => {
    try {
      const requestUrl = new URL(`${SERVER_URL}/messages`);
      requestUrl.searchParams.append('limit', limit.toString());
      if (cursor) {
        requestUrl.searchParams.append('before', cursor);
      }

      const response = await fetch(requestUrl.toString(), {
        headers: { Authorization: `Bearer ${authenticationToken}` }
      });

      if (response.ok) {
        const responseData: MessageResponse = await response.json();
        if (cursor) {
          setMessages(previousMessages => [...responseData.messages, ...previousMessages]);
        } else {
          setMessages(responseData.messages);

          if (responseData.messages.length > 0) {
            lastReadTimestampReference.current = responseData.messages[responseData.messages.length - 1]?.timestamp ?? null;
          }
          else{
            lastReadTimestampReference.current = null;
          }

          // Focus input after initial load
          messageInputRef.current?.focus();
        }
        setHasMore(responseData.hasMore);
        setNextCursor(responseData.nextCursor);
      } else {
        throw new Error('Failed to fetch messages');
      }
    } catch (error) {
      showAlert('Failed to fetch messages', 'error');
    }
  };

  const handleAuthentication = async (isRegistering: boolean = false): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/auth/${isRegistering ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setToken(responseData.token);
        setIsLoggedIn(true);
        setCurrentUser(responseData.userId);
        localStorage.setItem('token', responseData.token);
        showAlert(`Successfully ${isRegistering ? 'registered' : 'logged in'}!`, 'success');
        await fetchMessages(responseData.token);
      } else {
        showAlert(responseData.error || 'Authentication failed', 'error');
      }
    } catch (error) {
      showAlert('Network error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = (): void => {
    setToken('');
    setIsLoggedIn(false);
    setMessages([]);
    setCurrentUser(null);
    localStorage.removeItem('token');
    showAlert('Logged out successfully', 'info');
  };

  const sendMessage = async (messageBody: string, files?: FileList | null): Promise<boolean> => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('body', messageBody);
      
      if (files) {
        Array.from(files).forEach(file => {
          formData.append('attachments', file);
        });
      }

      const response = await fetch(`${SERVER_URL}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || 'Failed to send message');
      }

      return true;
    } catch (error) {
      showAlert(error instanceof Error ? error.message : 'Network error', 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Effect for initial authentication check
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      setIsLoggedIn(true);
      fetchMessages(storedToken);
    }
  }, []);

  // Update connection info when device info changes
  useEffect(() => {
    setConnectionInfo(prev => ({
      ...prev,
      deviceId,
      browserInfo
    }));
  }, [deviceId, browserInfo]);

  useEffect(() => {
    // Scroll on initial load or when messages first arrive
    if (messages.length > 0) {
      // Use a small timeout to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        scrollToBottom('auto');
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length]);

  // Effect for scroll event listener
  useEffect(() => {
    const container = messagesContainerReference.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // focus input when logged in
  useEffect(() => {
    if (isLoggedIn) {
      // Small delay to ensure component is mounted
      const timeoutId = setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <img src="/logo.svg" alt="Notifi Logo" className="h-32 mx-auto mb-8" />
          {alert && (
            <Alert variant={alert.type} className="mb-4">
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoading}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
            />
            <div className="flex space-x-4">
              <button
                onClick={() => handleAuthentication(false)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4 mr-2" /> Login
              </button>
              <button
                onClick={() => handleAuthentication(true)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex justify-between items-center bg-white shadow-sm p-4">
        <img src="/logo.svg" alt="Notifi Logo" className="items-center h-16 my-auto mx-0" />
        {connectionInfo.browserInfo && (
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                connectionInfo.connected ? 'bg-green-600' : 'bg-red-600'
              }`} />
              <span>
                {connectionInfo.connected ? 'Connected' : 'Disconnected'}
              </span>
              <span className="text-gray-500">
                ({connectionInfo.browserInfo.browser} {connectionInfo.browserInfo.deviceType} - 
                {connectionInfo.browserInfo.tabId.split('-')[2]})
              </span>
            </div>
          )}
        <div className="flex items-center gap-4">
          <ChatSettings 
            batchSize={batchSize}
            onBatchSizeChange={setBatchSize}
          />
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </button>
        </div>
      </div>

      {alert && (
        <Alert variant={alert.type} className="m-4">
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      <div 
        ref={messagesContainerReference}
        className="flex-1 overflow-y-auto p-4"
      >
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        )}
        
        <div className="flex flex-col space-y-4">
          {!messages || messages.length == 0 ? (
              <div className="flex justify-center items-center h-full text-gray-500">
                No messages yet
              </div>
            )
            : (
              messages.map((message, index) => (
                <div key={message.id}>
                  {(index === 0 || areDatesOnDifferentDays(message.timestamp, messages[index - 1].timestamp)) && (
                    <DateSeparator date={message.timestamp} />
                  )}
                  <MessageBubble
                    message={message}
                    isCurrentUser={message.user_id === currentUser}
                  />
                </div>
              ))
            )}
          <div ref={messagesEndReference} />
        </div>
      </div>

      {unreadCount > 0 && (
        <JumpToBottomButton
          onClick={() => scrollToBottom()}
          unreadCount={unreadCount}
        />
      )}

      <MessageInput 
        ref={messageInputRef}
        onSend={sendMessage} 
        disabled={isLoading}
        autoFocus
      />
    </div>
  );
}