/**
 * Service Worker for WebSocket Demo
 * Maintains single Socket.IO connection and broadcasts messages to all pages
 */

const BACKEND_HOST = '${BACKEND_HOST:-example.local}';
const BACKEND_PORT = '${BACKEND_PORT:-9001}';
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

// Import Socket.IO client (will be loaded from CDN or bundled)
// For now, we'll use dynamic import
let io = null;
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
    // Import socket.io-client dynamically
    if (!io) {
      // Use importScripts for service worker
      importScripts('https://cdn.socket.io/4.7.2/socket.io.min.js');
      io = self.io;
    }
    
    if (socket) {
      socket.disconnect();
    }
    
    if (!userGUID) {
      console.log('[SW] No GUID available, waiting for page to provide it');
      return;
    }
    
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
      console.error('[SW] Socket.IO connection error:', error);
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
  
  if (type === 'getStatus') {
    // Send current status
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
      connect();
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
  // Start connection
  connect();
});

/**
 * Handle fetch events (for offline support if needed)
 */
self.addEventListener('fetch', (event) => {
  // Let browser handle all fetches normally
  // We only use SW for WebSocket connection
});

