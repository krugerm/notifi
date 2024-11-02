// src/hooks/useWebSocket.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { Message } from '../types/message';
import { debug } from '../utils/debug';

interface WebSocketOptions {
  onMessage: (data: Message) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

interface BrowserInfo {
  platform: string;
  browser: string;
  deviceType: string;
  sessionId: string;
  tabId: string;
}

const getBrowserInfo = (): BrowserInfo => {
  // Detect browser
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = typeof navigator !== 'undefined' ? navigator.platform : '';
  let browser = 'Unknown';
  if (userAgent.includes('Firefox/')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Chrome/')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edge/')) {
    browser = 'Edge';
  }

  // Get or create session ID (persists across page refreshes)
  const storedSessionId = (typeof sessionStorage !== 'undefined' && sessionStorage) ? sessionStorage.getItem('chatSessionId') : null;
  const sessionId = storedSessionId ?? `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  if (typeof sessionStorage !== 'undefined' && sessionStorage && !storedSessionId) {
    sessionStorage.setItem('chatSessionId', sessionId);
  }

  // Generate unique tab ID
  const tabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return {
    platform: platform,
    browser,
    deviceType: userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
    sessionId,
    tabId
  };
};

const generateDeviceId = (): string => {
  const info = getBrowserInfo();
  return [
    info.platform,
    info.browser,
    info.deviceType,
    info.sessionId,
    info.tabId
  ].join('|');
};

// Each browser window/tab gets its own device ID
const windowDeviceId = generateDeviceId();

export const useWebSocket = (token: string | null, options: WebSocketOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const connectingRef = useRef(false);
  const optionsRef = useRef(options);
  const mountedRef = useRef(true);

  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    deviceId: windowDeviceId,
    info: getBrowserInfo()
  });

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(() => {
    if (!token || connectingRef.current || !mountedRef.current || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    connectingRef.current = true;
    // debug.log(`Connecting with device ID: ${windowDeviceId}`, getBrowserInfo());

    if (wsRef.current) {
      wsRef.current.close(1000, "Reconnecting");
      wsRef.current = null;
    }

    const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    
    try {
      const encodedDeviceId = encodeURIComponent(windowDeviceId);
      const url = `${WEBSOCKET_URL}/ws/messages?deviceId=${encodedDeviceId}&token=${token}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        debug.log(`Connection established for: ${windowDeviceId}`);
        connectingRef.current = false;
        setConnectionStatus({ 
          connected: true, 
          deviceId: windowDeviceId,
          info: getBrowserInfo()
        });
        optionsRef.current.onConnectionChange?.(true);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          optionsRef.current.onMessage(data);
        } catch (error) {
          debug.error('Error parsing message:', error);
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        debug.log(`Connection closed for: ${windowDeviceId}`, event);
        connectingRef.current = false;
        setConnectionStatus(prev => ({ ...prev, connected: false }));
        optionsRef.current.onConnectionChange?.(false);
        wsRef.current = null;

        // Only reconnect if not a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        debug.error(`WebSocket error for: ${windowDeviceId}`, error);
        connectingRef.current = false;
      };

      // Handle visibility change
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // debug.log(`Tab hidden, considering connection cleanup: ${windowDeviceId}`);
        } else {
          // debug.log(`Tab visible, checking connection: ${windowDeviceId}`);
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            connect();
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };

    } catch (error) {
      debug.error('Connection error:', error);
      connectingRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        debug.log(`Closing connection for unmount: ${windowDeviceId}`);
        wsRef.current.close(1000, "Component unmounting");
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected: connectionStatus.connected,
    deviceId: connectionStatus.deviceId,
    browserInfo: connectionStatus.info,
    reconnect: connect
  };
};