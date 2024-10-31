// src/services/websocket.ts
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocket, WebSocketServer } from 'ws';
import { environment } from '../config/environment';
import { Message } from '../types/message';
import { debug } from '../utils/debug';

interface WebSocketConnection extends WebSocket {
  userId?: number;
  deviceId?: string;
  browserId?: string;
  tabId?: string;
  isAlive?: boolean;
  pingTimeout?: NodeJS.Timeout;
  connectionId?: string;
}

export class WebSocketService {
  // Map of userId -> Map of deviceId -> WebSocket
  private static connections = new Map<number, Map<string, WebSocketConnection>>();
  private static wss: WebSocketServer | null = null;

  static initialize(wss: WebSocketServer) {
    if (this.wss) {
      debug.log('WebSocket server already initialized, cleaning up...');
      this.shutdown();
    }

    this.wss = wss;
    debug.log('Initializing WebSocket server');

    wss.on('connection', this.handleConnection.bind(this));
    debug.log('WebSocket server initialized');
  }

  private static async handleConnection(ws: WebSocketConnection, req: IncomingMessage) {
    try {
      ws.connectionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      debug.log(`New WebSocket connection attempt (${ws.connectionId})`);

      const { userId, deviceId } = await this.authenticateConnection(ws, req);
      if (!userId || !deviceId) {
        debug.log(`Authentication failed for connection ${ws.connectionId}`);
        ws.close(1008, "Authentication failed");
        return;
      }

      // Set up the new connection
      await this.setupConnection(ws, userId, deviceId);

    } catch (error) {
      debug.error(`Error in connection handler (${ws.connectionId}):`, error);
      ws.close(1011, "Internal server error");
    }
  }

  private static async authenticateConnection(
    ws: WebSocketConnection,
    req: IncomingMessage
  ): Promise<{ userId: number | null; deviceId: string | null}> {
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
      const deviceId = url.searchParams.get("deviceId") || 'default';

      if (!token) {
        debug.log(`No token provided in WebSocket connection ${ws.connectionId}`);
        return { userId: null, deviceId: null};
      }

      const payload = jwt.verify(token, environment.JWT_SECRET) as { userId: number };
      debug.log(`Authenticated WebSocket connection ${ws.connectionId} for user ${payload.userId} device ${deviceId}`);
      return { userId: payload.userId, deviceId};
    } catch (error) {
      debug.error(`WebSocket authentication error (${ws.connectionId}):`, error);
      return { userId: null, deviceId: null};
    }
  }

  private static async setupConnection(ws: WebSocketConnection, userId: number, deviceId: string) {
    ws.userId = userId;
    ws.deviceId = deviceId;
    ws.isAlive = true;

    // Initialize user's connection map if it doesn't exist
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Map());
    }

    const userConnections = this.connections.get(userId)!;

    // Close existing connection for this device if it exists
    const existingConnection = userConnections.get(deviceId);
    if (existingConnection) {
      debug.log(`Closing existing connection for user ${userId} device ${deviceId}`);
      existingConnection.close(1000, "New connection established");
      this.cleanupConnection(existingConnection);
    }

    // Set up event handlers
    ws.on('pong', () => {
      ws.isAlive = true;
      // debug.log(`Received pong from user ${userId} device ${deviceId} (${ws.connectionId})`);
    });

    ws.on('error', (error) => {
      debug.error(`WebSocket error for user ${userId} device ${deviceId} (${ws.connectionId}):`, error);
      this.cleanupConnection(ws);
    });

    ws.on('close', (code, reason) => {
      debug.log(`WebSocket closed for user ${userId} device ${deviceId} (${ws.connectionId}):`, {
        code,
        reason: reason.toString()
      });
      this.cleanupConnection(ws);
    });

    // Store the new connection
    userConnections.set(deviceId, ws);
    debug.log(`WebSocket connection ${ws.connectionId} established for user ${userId} device ${deviceId}`);

    // Set up ping interval
    const pingInterval = setInterval(() => {
      if (!ws.isAlive) {
        debug.log(`No pong received from user ${userId} device ${deviceId}, terminating`);
        clearInterval(pingInterval);
        ws.terminate();
        return;
      }

      ws.isAlive = false;
      try {
        ws.ping();
      } catch (error) {
        debug.error(`Error pinging user ${userId} device ${deviceId}:`, error);
        clearInterval(pingInterval);
        this.cleanupConnection(ws);
      }
    }, 30000);

    // Send initial ping
    ws.ping();
  }

  private static cleanupConnection(ws: WebSocketConnection) {
    if (!ws.userId || !ws.deviceId) return;

    const userConnections = this.connections.get(ws.userId);
    if (!userConnections) return;

    const currentConnection = userConnections.get(ws.deviceId);
    if (currentConnection === ws) {
      debug.log(`Cleaning up WebSocket connection for user ${ws.userId} device ${ws.deviceId}`);
      userConnections.delete(ws.deviceId);

      // Remove user's map if no more connections
      if (userConnections.size === 0) {
        this.connections.delete(ws.userId);
      }
    }
  }

  static broadcast(message: Message) {
    if (!this.wss) {
      debug.error('Attempted to broadcast before WebSocket server initialization');
      return;
    }

    let totalConnections = 0;
    let successCount = 0;
    let failCount = 0;

    this.connections.forEach((userConnections, userId) => {
      userConnections.forEach((ws, deviceId) => {
        totalConnections++;
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(message));
            successCount++;
            debug.log(`Sent message ${message.id} to user ${userId} device ${deviceId}`);
          } catch (error) {
            debug.error(`Failed to send message to user ${userId} device ${deviceId}:`, error);
            failCount++;
            this.cleanupConnection(ws);
          }
        } else {
          debug.log(`Connection not open for user ${userId} device ${deviceId}, state: ${ws.readyState}`);
          failCount++;
          this.cleanupConnection(ws);
        }
      });
    });

    debug.log(`Broadcast complete: ${successCount}/${totalConnections} successful`);
  }

  static getStats() {
    const stats = {
      users: this.connections.size,
      connections: [] as Array<{
        userId: number;
        deviceId: string;
        connectionId: string;
        isAlive: boolean;
      }>
    };

    this.connections.forEach((userConnections, userId) => {
      userConnections.forEach((ws, deviceId) => {
        stats.connections.push({
          userId,
          deviceId,
          connectionId: ws.connectionId!,
          isAlive: ws.isAlive!
        });
      });
    });

    return stats;
  }

  static shutdown() {
    debug.log('Shutting down WebSocket server');
    
    this.connections.forEach((userConnections, userId) => {
      userConnections.forEach((ws, deviceId) => {
        debug.log(`Closing connection for user ${userId} device ${deviceId}`);
        ws.close(1000, "Server shutting down");
      });
    });

    this.connections.clear();
    this.wss = null;
    debug.log('WebSocket server shutdown complete');
  }
}

function buildKey(deviceId: string, browserId: string, tabId: string): string {
  return `${deviceId}:${browserId}:${tabId}`;
}