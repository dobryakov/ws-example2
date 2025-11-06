/**
 * Client-side JavaScript for WebSocket Demo
 * Handles GUID generation, cookie management, and message display
 */

// Get backend URL from environment or use defaults
const BACKEND_HOST = window.location.hostname;
const BACKEND_PORT = window.location.port || '9001';
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

// BroadcastChannel for communication with service worker
const messageChannel = new BroadcastChannel('ws-messages');

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
 * Initialize client
 */
function init() {
  // Get or create GUID
  const guid = getOrCreateGUID();
  displayGUID(guid);
  
  // Load stored messages
  loadStoredMessages();
  
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
        // Wait for SW to be ready, then send GUID
        return navigator.serviceWorker.ready;
      })
      .then(() => {
        // Send GUID to service worker
        messageChannel.postMessage({ type: 'setGUID', data: guid });
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }
  
  // Listen for messages from service worker via BroadcastChannel
  messageChannel.onmessage = (event) => {
    const { type, data } = event.data;
    
    if (type === 'message') {
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
        console.error('Error storing message:', e);
      }
    } else if (type === 'messages') {
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
        console.error('Error storing messages:', e);
      }
    } else if (type === 'status') {
      updateStatus(data.connected);
    }
  };
  
  // Request status update
  messageChannel.postMessage({ type: 'getStatus' });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

