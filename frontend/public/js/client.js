/**
 * Client-side JavaScript for WebSocket Demo
 * Handles GUID generation, cookie management, and message display
 */

// Get backend URL - use relative URL (proxied through nginx)
// Service Worker will use empty string, direct connection will also use relative URL
const BACKEND_URL = ''; // Empty string = use current origin (proxied by nginx)

// BroadcastChannel for communication with service worker
const messageChannel = new BroadcastChannel('ws-messages');

// Direct Socket.IO connection (fallback when Service Worker is not available)
let directSocket = null;

/**
 * Generate GUID
 */
function generateGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get GUID from cookie or generate new one
 */
function getOrCreateGUID() {
  const cookies = document.cookie.split(';').map(c => c.trim());
  const guidCookie = cookies.find(c => c.startsWith('userGUID='));
  
  if (guidCookie) {
    const guid = guidCookie.split('=')[1];
    // Validate GUID format
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guid)) {
      return guid;
    }
  }
  
  // Generate new GUID
  const newGUID = generateGUID();
  // Set cookie (expires in 1 year)
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `userGUID=${newGUID}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  
  return newGUID;
}

/**
 * Display GUID on page
 */
function displayGUID(guid) {
  const guidDisplay = document.getElementById('guidDisplay');
  if (guidDisplay) {
    guidDisplay.textContent = guid;
  }
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('ru-RU');
}

/**
 * Display message on page
 */
function displayMessage(message) {
  const container = document.getElementById('messagesContainer');
  if (!container) return;
  
  // Remove "no messages" placeholder
  const placeholder = container.querySelector('p');
  if (placeholder && placeholder.textContent.includes('Сообщений пока нет')) {
    container.removeChild(placeholder);
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  messageDiv.innerHTML = `
    <div class="message-time">${formatTimestamp(message.timestamp)}</div>
    <div class="message-text">${escapeHtml(message.text)}</div>
  `;
  
  container.insertBefore(messageDiv, container.firstChild);
  
  // Keep only last 50 messages in DOM (for performance)
  while (container.children.length > 50) {
    container.removeChild(container.lastChild);
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Update connection status
 */
function updateStatus(connected) {
  const statusEl = document.getElementById('status');
  if (!statusEl) return;
  
  if (connected) {
    statusEl.textContent = 'Подключено';
    statusEl.className = 'status connected';
  } else {
    statusEl.textContent = 'Отключено';
    statusEl.className = 'status disconnected';
  }
}

/**
 * Load stored messages from localStorage
 */
function loadStoredMessages() {
  try {
    const stored = localStorage.getItem('ws-messages');
    if (stored) {
      const messages = JSON.parse(stored);
      // Display messages in reverse order (newest first)
      messages.reverse().forEach(msg => displayMessage(msg));
    }
  } catch (e) {
    console.error('Error loading stored messages:', e);
  }
}

/**
 * Connect directly to Socket.IO from page (fallback when Service Worker is not available)
 */
function connectDirectSocket(guid) {
  console.log('[Client] Loading Socket.IO client for direct connection...');
  
  // Load Socket.IO client if not already loaded
  if (typeof io === 'undefined') {
    const script = document.createElement('script');
    script.src = '/js/socket.io.min.js';
    script.onload = () => {
      console.log('[Client] Socket.IO client loaded, connecting...');
      initDirectSocket(guid);
    };
    script.onerror = (error) => {
      console.error('[Client] Failed to load Socket.IO client:', error);
      updateStatus(false);
    };
    document.head.appendChild(script);
  } else {
    initDirectSocket(guid);
  }
}

/**
 * Initialize direct Socket.IO connection
 */
function initDirectSocket(guid) {
  try {
    if (directSocket) {
      directSocket.disconnect();
    }
    
    console.log('[Client] Connecting to Socket.IO directly (fallback mode)');
    console.log('[Client] Using URL:', BACKEND_URL || '(current origin)');
    
    directSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      query: {
        userGUID: guid
      },
      withCredentials: true
    });
    
    directSocket.on('connect', () => {
      console.log('[Client] Direct Socket.IO connected');
      updateStatus(true);
    });
    
    directSocket.on('disconnect', (reason) => {
      console.log('[Client] Direct Socket.IO disconnected:', reason);
      updateStatus(false);
    });
    
    directSocket.on('connect_error', (error) => {
      console.error('[Client] Direct Socket.IO connection error:', error);
      updateStatus(false);
    });
    
    directSocket.on('message', (message) => {
      console.log('[Client] Received message via direct connection:', message);
      displayMessage(message);
      // Store message
      try {
        const stored = localStorage.getItem('ws-messages');
        const messages = stored ? JSON.parse(stored) : [];
        messages.push(message);
        if (messages.length > 10) {
          messages.shift();
        }
        localStorage.setItem('ws-messages', JSON.stringify(messages));
      } catch (e) {
        console.error('[Client] Error storing message:', e);
      }
    });
    
    directSocket.on('messages', (messages) => {
      console.log('[Client] Received bulk messages via direct connection:', messages.length);
      messages.forEach(msg => {
        displayMessage(msg);
      });
      // Store messages
      try {
        const stored = localStorage.getItem('ws-messages');
        const existing = stored ? JSON.parse(stored) : [];
        messages.forEach(msg => {
          existing.push(msg);
        });
        while (existing.length > 10) {
          existing.shift();
        }
        localStorage.setItem('ws-messages', JSON.stringify(existing));
      } catch (e) {
        console.error('[Client] Error storing messages:', e);
      }
    });
    
  } catch (error) {
    console.error('[Client] Error setting up direct Socket.IO connection:', error);
    updateStatus(false);
  }
}

/**
 * Initialize client
 */
function init() {
  console.log('[Client] Initializing...');
  
  // Get or create GUID
  const guid = getOrCreateGUID();
  console.log('[Client] GUID:', guid);
  displayGUID(guid);
  
  // Load stored messages
  loadStoredMessages();
  
  // Register service worker
  console.log('[Client] Checking Service Worker support...');
  console.log('[Client] navigator.serviceWorker:', typeof navigator.serviceWorker);
  console.log('[Client] location.protocol:', window.location.protocol);
  console.log('[Client] location.hostname:', window.location.hostname);
  console.log('[Client] isSecureContext:', window.isSecureContext);
  
  if ('serviceWorker' in navigator) {
    console.log('[Client] Service Worker support detected, registering...');
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('[Client] Service Worker registered successfully:', registration);
        console.log('[Client] Service Worker scope:', registration.scope);
        console.log('[Client] Service Worker state:', registration.active?.state || registration.installing?.state || registration.waiting?.state);
        // Wait for SW to be ready, then send GUID
        return navigator.serviceWorker.ready;
      })
      .then(registration => {
        console.log('[Client] Service Worker ready, sending GUID:', guid);
        // Send GUID to service worker
        messageChannel.postMessage({ type: 'setGUID', data: guid });
        console.log('[Client] GUID sent to Service Worker via BroadcastChannel');
      })
      .catch(error => {
        console.error('[Client] Service Worker registration failed:', error);
        console.error('[Client] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      });
  } else {
    console.warn('[Client] Service Worker not supported in this browser');
    console.warn('[Client] This may be because:');
    console.warn('[Client] 1. Browser does not support Service Workers');
    console.warn('[Client] 2. Page is not served over HTTPS (required for non-localhost domains)');
    console.warn('[Client] 3. Browser has Service Workers disabled');
    console.warn('[Client] Current protocol:', window.location.protocol);
    console.warn('[Client] Current hostname:', window.location.hostname);
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.warn('[Client] ⚠️ Service Workers require HTTPS for non-localhost domains!');
      console.warn('[Client] Falling back to direct Socket.IO connection from page');
    }
    
    // Fallback: connect directly from page if Service Worker is not available
    console.log('[Client] Setting up direct Socket.IO connection as fallback...');
    connectDirectSocket(guid);
  }
  
  // Listen for messages from service worker via BroadcastChannel
  console.log('[Client] Setting up BroadcastChannel listener...');
  messageChannel.onmessage = (event) => {
    console.log('[Client] Received message from Service Worker:', event.data);
    const { type, data } = event.data;
    
    if (type === 'message') {
      console.log('[Client] Received message:', data);
      displayMessage(data);
      // Store message in localStorage (keep last 10)
      try {
        const stored = localStorage.getItem('ws-messages');
        const messages = stored ? JSON.parse(stored) : [];
        messages.push(data);
        // Keep only last 10 messages
        if (messages.length > 10) {
          messages.shift();
        }
        localStorage.setItem('ws-messages', JSON.stringify(messages));
      } catch (e) {
        console.error('[Client] Error storing message:', e);
      }
    } else if (type === 'messages') {
      console.log('[Client] Received bulk messages:', data.length);
      // Bulk messages (on connection)
      data.forEach(msg => {
        displayMessage(msg);
      });
      // Store all messages
      try {
        const stored = localStorage.getItem('ws-messages');
        const messages = stored ? JSON.parse(stored) : [];
        data.forEach(msg => {
          messages.push(msg);
        });
        // Keep only last 10 messages
        while (messages.length > 10) {
          messages.shift();
        }
        localStorage.setItem('ws-messages', JSON.stringify(messages));
      } catch (e) {
        console.error('[Client] Error storing messages:', e);
      }
    } else if (type === 'status') {
      console.log('[Client] Status update:', data.connected ? 'Connected' : 'Disconnected');
      updateStatus(data.connected);
    }
  };
  
  // Request status update
  console.log('[Client] Requesting initial status from Service Worker...');
  messageChannel.postMessage({ type: 'getStatus' });
  
  console.log('[Client] Initialization complete');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

