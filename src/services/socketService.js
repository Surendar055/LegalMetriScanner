import { io } from 'socket.io-client';

/**
 * Socket.IO service for LegalMetriScan
 * Handles real-time pairing between Laptop Inspector Station and Mobile Phone Scanner
 */

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
    this.currentSessionId = null;
    this.role = null; // 'laptop' | 'phone'
    this.deviceInfo = null;
    this.pendingScans = [];
  }

  getBackendUrl() {
    if (import.meta.env.VITE_SOCKET_URL) {
      return import.meta.env.VITE_SOCKET_URL;
    }
    // In browser, route through Vite proxy / same origin so SSL & proxies work effortlessly
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${host}:4001`;
  }

  init(serverUrl = this.getBackendUrl()) {
    if (this.socket) {
      return this.socket;
    }

    try {
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 50,
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
        timeout: 45000,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        console.log('[SocketService] Connected to backend:', this.socket.id, 'Role:', this.role);
        this.emitInternal('connection:change', { status: 'Connected', socketId: this.socket.id });

        // If we already have a session ID, re-announce with the CORRECT role
        if (this.currentSessionId) {
          if (this.role === 'phone') {
            console.log('[SocketService] Auto re-joining session as phone:', this.currentSessionId);
            this.socket.emit('session:join', {
              sessionId: this.currentSessionId,
              deviceInfo: this.deviceInfo || { name: 'Mobile Scanner Unit', model: 'Handheld Scanner' },
            });
          } else if (this.role === 'laptop') {
            console.log('[SocketService] Auto re-initializing session as laptop:', this.currentSessionId);
            this.socket.emit('session:init', { sessionId: this.currentSessionId });
          }
        }

        // Flush any pending scans queued while offline/processing
        while (this.pendingScans.length > 0) {
          const item = this.pendingScans.shift();
          console.log('[SocketService] Flushing queued scan to backend:', item.scanData?.productName);
          this.socket.emit('scan:submit', { sessionId: item.sessionId, scanData: item.scanData });
        }
      });

      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        console.log('[SocketService] Disconnected from backend:', reason);
        this.emitInternal('connection:change', { status: 'Disconnected', reason });
      });

      this.socket.on('device:connected', (data) => {
        console.log('[SocketService] Device Connected event received:', data);
        this.emitInternal('device:connected', data);
      });

      this.socket.on('device:disconnected', (data) => {
        console.log('[SocketService] Device Disconnected event received:', data);
        this.emitInternal('device:disconnected', data);
      });

      this.socket.on('scan:received', (data) => {
        console.log('[SocketService] Scan Received event received:', data);
        this.emitInternal('scan:received', data);
      });

      this.socket.on('session:ready', (data) => {
        this.emitInternal('session:ready', data);
      });

      this.socket.on('session:joined_success', (data) => {
        this.emitInternal('session:joined_success', data);
      });
    } catch (err) {
      console.warn('[SocketService] Error establishing socket connection:', err);
    }

    return this.socket;
  }

  // Laptop registers session room
  initSession(sessionId) {
    this.role = 'laptop';
    this.currentSessionId = sessionId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('session:init', { sessionId });
    }
  }

  // Phone joins session room
  joinSession(sessionId, deviceInfo) {
    this.role = 'phone';
    this.currentSessionId = sessionId;
    this.deviceInfo = deviceInfo;
    if (this.socket && this.socket.connected) {
      this.socket.emit('session:join', { sessionId, deviceInfo });
    } else {
      // Re-try once connected
      const checkAndJoin = () => {
        if (this.socket && this.socket.connected) {
          this.socket.emit('session:join', { sessionId, deviceInfo });
        } else {
          setTimeout(checkAndJoin, 300);
        }
      };
      checkAndJoin();
    }
  }

  // Phone sends a scan to Laptop
  submitScan(sessionId, scanData) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('scan:submit', { sessionId, scanData });
    } else {
      console.warn('[SocketService] Socket offline during scan submission. Queueing scan for delivery upon reconnect...');
      this.pendingScans.push({ sessionId, scanData });
    }
    // Also trigger local event
    this.emitInternal('scan:received', scanData);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
    this.emitInternal(event, data);
  }

  emitInternal(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[SocketService] Error executing listener for "${event}":`, e);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.connected = false;
  }
}

export const socketService = new SocketService();
export default socketService;
