"use client";

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, LogIn, LogOut, Send, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// Types
interface Notification {
  id: number;
  title: string;
  body: string;
  timestamp: string;
}

interface AlertState {
  message: string;
  type: 'default' | 'info' | 'success' | 'error';
}

const SERVER_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export default function Home() {
  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newNotification, setNewNotification] = useState({ title: '', body: '' });
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}/ws/notifications?token=${token}`);
    
    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      setNotifications(prev => [notification, ...prev]);
      
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.body });
      }
    };

    ws.onclose = () => {
      // Attempt to reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    };

    return () => ws.close();
  }, [token]);

  // Effects
  useEffect(() => {
    // Check for stored token
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      setIsLoggedIn(true);
      fetchNotifications(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      connectWebSocket();
      
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [token, connectWebSocket]);

  // Utility functions
  const showAlert = (message: string, type: AlertState['type'] = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const fetchNotifications = async (authToken: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      } else {
        throw new Error('Failed to fetch notifications');
      }
    } catch (error) {
      showAlert('Failed to fetch notifications', 'error');
    }
  };

  // Auth handlers
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
        localStorage.setItem('token', data.token);
        showAlert(`Successfully ${isRegistering ? 'registered' : 'logged in'}!`, 'success');
        await fetchNotifications(data.token);
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
    setNotifications([]);
    localStorage.removeItem('token');
    showAlert('Logged out successfully', 'info');
  };

  // Notification handlers
  const sendNotification = async () => {
    if (!newNotification.title || !newNotification.body) {
      showAlert('Please fill in both title and message', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newNotification),
      });

      if (response.ok) {
        setNewNotification({ title: '', body: '' });
        showAlert('Notification sent!', 'success');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send notification');
      }
    } catch (error) {
      showAlert(error instanceof Error ? error.message : 'Network error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Auth form
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">Notifi</h1>
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
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            <div className="flex space-x-4">
              <button
                onClick={() => handleAuth(false)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4 mr-2" /> Login
              </button>
              <button
                onClick={() => handleAuth(true)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Register
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {alert && (
          <Alert variant={alert.type}>
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center bg-white rounded-lg shadow-md p-4">
          <h1 className="text-2xl font-bold">Notifi</h1>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Send Notification</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Title"
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newNotification.title}
              onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
              disabled={isLoading}
            />
            <textarea
              placeholder="Message"
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newNotification.body}
              onChange={(e) => setNewNotification(prev => ({ ...prev, body: e.target.value }))}
              disabled={isLoading}
              rows={3}
            />
            <button
              onClick={sendNotification}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" /> Send
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Bell className="w-6 h-6 mr-2" /> Notifications
          </h2>
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No notifications yet</p>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className="border-b pb-4">
                  <h3 className="font-semibold">{notif.title}</h3>
                  <p className="text-gray-600">{notif.body}</p>
                  <span className="text-sm text-gray-400">
                    {new Date(notif.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}