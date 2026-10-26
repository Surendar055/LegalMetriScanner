import { io } from 'socket.io-client';

/**
 * Socket.IO service for LegalMetriScan
 * Handles real-time pairing between Laptop Inspector Station and Mobile Phone Scanner
 */

import { getSocketUrl, getApiUrl } from '../config/api.js';

class SocketService {
  constructor() {
    this.socket = null;
    this.eventSource = null;
    this.listeners = new Map();
    this.connected = false;
    this.currentSessionId = null;
    this.role = null; // 'laptop' | 'phone'
    this.deviceInfo = null;
    this.pendingScans = [];
  }

  getBackendUrl() {
    return getSocketUrl();
  }

  initSse(sessionId) {
    if (typeof EventSource === 'undefined' || !sessionId) return;
    if (this.eventSource) {
      try { this.eventSource.close(); } catch (e) {}
    }

    try {
      const sseUrl = getApiUrl(`/api/session/${sessionId}/events`);
      console.log('[SocketService] Subscribing to single-port SSE stream:', sseUrl);
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.addEventListener('device:connected', (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('[SocketService-SSE] Device Connected event received:', data);
          this.emitInternal('device:connected', data);
        } catch (err) {
          console.warn('[SocketService-SSE] Parse error for device:connected:', err);
        }
      });

      this.eventSource.addEventListener('scan:received', (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('[SocketService-SSE] Scan Received event received:', data);
          this.emitInternal('scan:received', data);
        } catch (err) {
          console.warn('[SocketService-SSE] Parse error for scan:received:', err);
        }
      });

      this.eventSource.addEventListener('connection:ready', (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('[SocketService-SSE] Real-time session stream connected:', data);
          this.connected = true;
          this.emitInternal('connection:change', { status: 'Connected', sse: true });
        } catch (err) {}
      });

      this.eventSource.onerror = (err) => {
        // SSE browser client will automatically retry reconnecting
      };
    } catch (e) {
      console.warn('[SocketService] Notice: could not init SSE stream:', e);
    }
  }

  init(serverUrl = this.getBackendUrl()) {
    if (this.socket) {
      return this.socket;
    }

    try {
      console.log('[SocketService] Connecting to real-time endpoint:', serverUrl);
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 50,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
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

    // Connect to single-port SSE event stream
    this.initSse(sessionId);

    if (this.socket && this.socket.connected) {
      this.socket.emit('session:init', { sessionId });
    }
  }

  // Phone joins session room
  joinSession(sessionId, deviceInfo) {
    this.role = 'phone';
    this.currentSessionId = sessionId;
    this.deviceInfo = deviceInfo;

    // 1. Single-port REST pairing (guarantees pairing on Render single-port deployments)
    try {
      fetch(getApiUrl(`/api/session/${sessionId}/join`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceInfo }),
      })
        .then((res) => {
          if (res.ok) {
            console.log('[SocketService] Paired via single-port REST endpoint successfully');
            this.emitInternal('session:joined_success', { sessionId, mode: 'single-port' });
          }
        })
        .catch((e) => console.warn('[SocketService] REST session join notice:', e));
    } catch (e) {}

    // 2. Also pair via Socket.IO if connected
    if (this.socket && this.socket.connected) {
      this.socket.emit('session:join', { sessionId, deviceInfo });
    } else {
      const checkAndJoin = () => {
        if (this.socket && this.socket.connected) {
          this.socket.emit('session:join', { sessionId, deviceInfo });
        } else {
          setTimeout(checkAndJoin, 500);
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
      console.log('[SocketService] Socket offline / using single-port mode; scan persisted and delivered via REST API');
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
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (e) {}
      this.eventSource = null;
    }
    this.connected = false;
  }
}

export const socketService = new SocketService();
export default socketService;
