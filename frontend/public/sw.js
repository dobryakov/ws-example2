/**
 * Service Worker for WebSocket Demo
 * Maintains single Socket.IO connection and broadcasts messages to all pages
 */

// Use relative URL for Socket.IO - will be proxied through nginx
// In production, nginx proxies /socket.io/ to backend
// Always use relative URL (empty string) to let nginx proxy the connection
// Socket.IO will use current origin, which will be proxied by nginx
const BACKEND_HOST = '${BACKEND_HOST}' || 'backend';
const BACKEND_PORT = '${BACKEND_PORT}' || '9001';
// Always use relative URL in production - nginx will proxy /socket.io/ to backend
// This ensures connection works regardless of hostname/port configuration
const BACKEND_URL = ''; // Empty string = use current origin (will be proxied by nginx)

// Diagnostic logging
console.log('[SW] Configuration:', {
  BACKEND_HOST,
  BACKEND_PORT,
  BACKEND_URL: BACKEND_URL || '(current origin - proxied by nginx)',
  location: self.location.href
});

// Import Socket.IO client (will be loaded from CDN or bundled)
// Load Socket.IO client synchronously at SW initialization
// This must be done synchronously, not in async function
try {
  const scriptPath = 'js/socket.io.min.js';
  const socketIoUrl = new URL(scriptPath, self.location);
  console.log('[SW] Loading Socket.IO client at initialization', socketIoUrl.href);
  importScripts(socketIoUrl.href);
  var io = self.io || globalThis.io;
  console.log('[SW] Socket.IO client loaded at init:', !!io, { 
    hasSelfIo: !!self.io, 
    hasGlobalIo: !!globalThis.io,
    ioType: typeof io
  });
} catch (importErr) {
  console.error('[SW] Failed to load Socket.IO client at initialization', importErr, {
    name: importErr.name,
    message: importErr.message,
    stack: importErr.stack
  });
  var io = null;
}

let socket = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let userGUID = null;

// Exponential backoff delays: 5s, 10s, 20s, then 30s max
const BACKOFF_DELAYS = [5000, 10000, 20000, 30000];
const MAX_BACKOFF = 30000;

// BroadcastChannel for communication with pages
const messageChannel = new BroadcastChannel('ws-messages');

/**
 * Get backoff delay based on attempt number
 */
function getBackoffDelay(attempt) {
  if (attempt < BACKOFF_DELAYS.length) {
    return BACKOFF_DELAYS[attempt];
  }
  return MAX_BACKOFF;
}

/**
 * Connect to Socket.IO server
 */
async function connect() {
  try {
    console.log('[SW] connect() start', { BACKEND_URL, location: self.location.href, hasIo: !!io });
    // Check if Socket.IO client is available
    if (!io) {
      console.error('[SW] Socket.IO client not available, cannot connect');
      throw new Error('Socket.IO client not loaded');
    }
    
    if (socket) {
      socket.disconnect();
    }
    
    if (!userGUID) {
      console.log('[SW] No GUID available, waiting for page to provide it');
      return;
    }
    
    console.log('[SW] Attempting Socket.IO connect to', BACKEND_URL || '(current origin)');
    socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'], // Enable fallback to long-polling
      reconnection: false, // We handle reconnection manually
      query: {
        userGUID: userGUID
      },
      withCredentials: true
    });
    
    socket.on('connect', () => {
      console.log('[SW] Socket.IO connected');
      reconnectAttempts = 0;
      messageChannel.postMessage({ type: 'status', data: { connected: true } });
    });
    
    socket.on('disconnect', (reason) => {
      console.log('[SW] Socket.IO disconnected:', reason);
      messageChannel.postMessage({ type: 'status', data: { connected: false } });
      
      // Schedule reconnection with exponential backoff
      scheduleReconnect();
    });
    
    socket.on('connect_error', (error) => {
      console.error('[SW] Socket.IO connection error:', {
        message: error?.message || error,
        type: error?.type,
        description: error?.description,
        context: error?.context,
        BACKEND_URL: BACKEND_URL || '(current origin)',
        location: self.location.href
      });
      messageChannel.postMessage({ type: 'status', data: { connected: false } });
      
      // Schedule reconnection
      scheduleReconnect();
    });
    
    socket.on('message', (message) => {
      console.log('[SW] Received message:', message);
      messageChannel.postMessage({ type: 'message', data: message });
    });
    
    socket.on('messages', (messages) => {
      console.log('[SW] Received bulk messages:', messages.length);
      messageChannel.postMessage({ type: 'messages', data: messages });
    });
    
  } catch (error) {
    console.error('[SW] Error connecting:', error);
    scheduleReconnect();
  }
}

/**
 * Schedule reconnection with exponential backoff
 */
function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  const delay = getBackoffDelay(reconnectAttempts);
  console.log(`[SW] Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts + 1})`);
  
  reconnectTimer = setTimeout(() => {
    reconnectAttempts++;
    connect();
  }, delay);
}

/**
 * Handle messages from pages
 */
messageChannel.onmessage = (event) => {
  const { type, data } = event.data;
  console.log('[SW] Received message from page:', { type, data });
  
  if (type === 'getStatus') {
    // Send current status
    console.log('[SW] getStatus request, current socket state:', { hasSocket: !!socket, connected: socket?.connected });
    messageChannel.postMessage({
      type: 'status',
      data: { connected: socket && socket.connected }
    });
  } else if (type === 'setGUID') {
    // Receive GUID from page
    userGUID = data;
    console.log('[SW] Received GUID from page:', userGUID);
    // Connect if not already connected
    if (!socket || !socket.connected) {
      console.log('[SW] Starting connection with GUID:', userGUID);
      connect();
    } else {
      console.log('[SW] Already connected, skipping');
    }
  }
};

/**
 * Service Worker install event
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing');
  self.skipWaiting(); // Activate immediately
});

/**
 * Service Worker activate event
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating');
  event.waitUntil(self.clients.claim()); // Take control of all pages
  // Don't connect here - wait for GUID from page
  // connect() will be called when GUID is received via messageChannel
  console.log('[SW] Activated, waiting for GUID from page');
});

/**
 * Handle fetch events (for offline support if needed)
 */
self.addEventListener('fetch', (event) => {
  // Let browser handle all fetches normally
  // We only use SW for WebSocket connection
});

