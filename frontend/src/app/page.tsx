// src/app/page.tsx
"use client";

import { AuthForm } from '@/components/auth/AuthForm';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertState, Message } from '@/types/chat';
import { LogOut } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const SERVER_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<number | null>(null);

  const connectWebSocket = useCallback(() => {
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}/ws/messages?token=${token}`);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [message, ...prev]);
    };

    ws.onclose = () => {
      setTimeout(connectWebSocket, 5000);
    };

    return () => ws.close();
  }, [token]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      setIsLoggedIn(true);
      fetchMessages(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      connectWebSocket();
    }
  }, [token, connectWebSocket]);

  const showAlert = (message: string, type: AlertState['type'] = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const fetchMessages = async (authToken: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/messages`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        throw new Error('Failed to fetch messages');
      }
      return true;
    } catch (error) {
      showAlert(error instanceof Error ? error.message : 'Network error', 'error');
      return false;
    }
  };

  const handleAuth = async (isRegistering = false) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/users/${isRegistering ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setIsLoggedIn(true);
        setCurrentUser(data.userId);
        localStorage.setItem('token', data.token);
        showAlert(`Successfully ${isRegistering ? 'registered' : 'logged in'}!`, 'success');
        await fetchMessages(data.token);
      } else {
        showAlert(data.error || 'Authentication failed', 'error');
      }
    } catch (error) {
      showAlert('Network error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setIsLoggedIn(false);
    setMessages([]);
    setCurrentUser(null);
    localStorage.removeItem('token');
  };

  const sendMessage = async (body: string, files?: FileList | null): Promise<boolean> => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('body', body);
      
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
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      showAlert(error instanceof Error ? error.message : 'Network error', 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
    return true;
  };

  if (!isLoggedIn) {
    return (
      <AuthForm
        onAuth={handleAuth}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        alert={alert}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex justify-between items-center bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold">Chat App</h1>
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </button>
      </div>

      {alert && (
        <Alert variant={alert.type} className="m-4">
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isCurrentUser={message.user_id === currentUser}
          />
        ))}
      </div>

      <MessageInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}