/**
 * Basic E2E tests for WebSocket Demo
 */

import { test, expect } from '@playwright/test';

const HOST = process.env.HOST || 'example.local';
const FRONTEND_PORT = process.env.FRONTEND_PORT || '9000';
const BACKEND_HOST = process.env.BACKEND_HOST || HOST;
const BACKEND_PORT = process.env.BACKEND_PORT || '9001';

// In test environment with network_mode: service:frontend, use localhost:80
// (internal container port, not host port)
const BASE_URL = HOST === 'localhost'
  ? `http://localhost:80`  // Internal container port when using network_mode: service:frontend
  : `http://${HOST}:${FRONTEND_PORT}`;
// For API calls, use frontend URL (proxied through nginx) in test environment
const BACKEND_URL = HOST === 'localhost'
  ? BASE_URL  // Use frontend URL, API is proxied through nginx
  : `http://${BACKEND_HOST}:${BACKEND_PORT}`;

test.describe('Basic Functionality', () => {
  test('should generate and display GUID on page 1', async ({ page }) => {
    await page.goto(`${BASE_URL}/index1.html`);
    
    const guidDisplay = page.locator('#guidDisplay');
    await expect(guidDisplay).toBeVisible();
    
    const guidText = await guidDisplay.textContent();
    expect(guidText).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  test('should display same GUID on page 2', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/index1.html`);
    const guid1 = await page.locator('#guidDisplay').textContent();
    
    await page.goto(`${BASE_URL}/index2.html`);
    const guid2 = await page.locator('#guidDisplay').textContent();
    
    expect(guid1).toBe(guid2);
  });

  test('should receive message when online', async ({ page }) => {
    // Collect console logs for debugging
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(text);
      console.log(text);
    });
    
    // Collect page errors
    page.on('pageerror', error => {
      console.error('[PAGE ERROR]', error.message);
      consoleLogs.push(`[ERROR] ${error.message}`);
    });
    
    await page.goto(`${BASE_URL}/index1.html`);
    
    // Wait for GUID to be displayed
    const guidDisplay = page.locator('#guidDisplay');
    await expect(guidDisplay).toBeVisible();
    const guid = await guidDisplay.textContent();
    console.log('[TEST] GUID:', guid);
    
    // Wait for Service Worker to be ready and check its state
    await page.waitForTimeout(1000);
    const swInfo = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const sw = registration.active;
        if (sw) {
          // Try to get SW state and check for errors
          const swErrors: string[] = [];
          sw.addEventListener('error', (e) => {
            swErrors.push(`SW Error: ${e.message || 'Unknown error'}`);
          });
          
          // Request status from SW via BroadcastChannel
          const channel = new BroadcastChannel('ws-messages');
          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              channel.close();
              resolve({
                state: sw.state,
                scriptURL: sw.scriptURL,
                hasSW: true,
                errors: swErrors
              });
            }, 1000);
            
            channel.onmessage = (event) => {
              if (event.data.type === 'status') {
                clearTimeout(timeout);
                channel.close();
                resolve({
                  state: sw.state,
                  scriptURL: sw.scriptURL,
                  hasSW: true,
                  status: event.data.data,
                  errors: swErrors
                });
              }
            };
            
            channel.postMessage({ type: 'getStatus' });
          });
        }
      }
      return { hasSW: false };
    });
    console.log('[TEST] Service Worker info:', JSON.stringify(swInfo, null, 2));
    
    // Wait for connection status
    const status = page.locator('#status');
    await expect(status).toContainText(/Подключено|Отключено/);
    const statusText = await status.textContent();
    console.log('[TEST] Initial status:', statusText);
    
    // Wait a bit for Service Worker to connect
    await page.waitForTimeout(2000);
    const statusAfterWait = await status.textContent();
    console.log('[TEST] Status after 2s wait:', statusAfterWait);
    
    // Log console messages
    console.log('[TEST] Console logs:', consoleLogs.join('\n'));
    
    // Send message via API
    const response = await page.request.post(`${BACKEND_URL}/api/enqueue`, {
      data: {
        userId: guid,
        text: 'Test message from E2E'
      }
    });
    
    expect(response.status()).toBe(202);
    console.log('[TEST] Message enqueued, status:', response.status());
    
    // Wait for message to appear (should be delivered within 2 seconds)
    const messageContainer = page.locator('#messagesContainer');
    await expect(messageContainer.locator('.message')).toBeVisible({ timeout: 3000 });
    
    const messageText = await messageContainer.locator('.message .message-text').first().textContent();
    expect(messageText).toContain('Test message from E2E');
  });

  test('should queue message when offline and deliver on connect', async ({ page, context }) => {
    // First open the page, then go offline
    await page.goto(`${BASE_URL}/index1.html`);
    // Disable network
    await context.setOffline(true);
    const guidDisplay = page.locator('#guidDisplay');
    await expect(guidDisplay).toBeVisible();
    const guid = await guidDisplay.textContent();
    
    // Send message while offline
    const response = await page.request.post(`${BACKEND_URL}/api/enqueue`, {
      data: {
        userId: guid,
        text: 'Offline message'
      }
    });
    
    expect(response.status()).toBe(202);
    
    // Re-enable network
    await context.setOffline(false);
    
    // Wait for connection and message delivery
    const status = page.locator('#status');
    await expect(status).toContainText('Подключено', { timeout: 10000 });
    
    // Message should be delivered
    const messageContainer = page.locator('#messagesContainer');
    await expect(messageContainer.locator('.message')).toBeVisible({ timeout: 5000 });
    
    const messageText = await messageContainer.locator('.message .message-text').first().textContent();
    expect(messageText).toContain('Offline message');
  });

  test('should persist last 10 messages in localStorage', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/index1.html`);
    const guidDisplay = page.locator('#guidDisplay');
    await expect(guidDisplay).toBeVisible();
    const guid = await guidDisplay.textContent();
    
    // Wait for connection
    const status = page.locator('#status');
    await expect(status).toContainText(/Подключено|Отключено/);
    
    // Send 12 messages
    for (let i = 1; i <= 12; i++) {
      await page.request.post(`${BACKEND_URL}/api/enqueue`, {
        data: {
          userId: guid,
          text: `Message ${i}`
        }
      });
      await page.waitForTimeout(100); // Small delay between messages
    }
    
    // Wait for messages to be delivered
    await page.waitForTimeout(2000);
    
    // Check localStorage
    const storedMessages = await page.evaluate(() => {
      const stored = localStorage.getItem('ws-messages');
      return stored ? JSON.parse(stored) : [];
    });
    
    // Should have exactly 10 messages (last 10)
    expect(storedMessages).toHaveLength(10);
    expect(storedMessages[storedMessages.length - 1].text).toBe('Message 12');
    expect(storedMessages[0].text).toBe('Message 3'); // First 2 should be evicted
  });

  test('should maintain messages during navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/index1.html`);
    const guidDisplay = page.locator('#guidDisplay');
    await expect(guidDisplay).toBeVisible();
    const guid = await guidDisplay.textContent();
    
    // Wait for connection
    await page.waitForTimeout(1000);
    
    // Send a message
    await page.request.post(`${BACKEND_URL}/api/enqueue`, {
      data: {
        userId: guid,
        text: 'Message before navigation'
      }
    });
    
    // Wait for message
    await page.waitForTimeout(1000);
    
    // Navigate to page 2
    await page.goto(`${BASE_URL}/index2.html`);
    
    // Message should still be visible
    const messageContainer = page.locator('#messagesContainer');
    await expect(messageContainer.locator('.message')).toBeVisible({ timeout: 2000 });
    
    const messageText = await messageContainer.locator('.message .message-text').first().textContent();
    expect(messageText).toContain('Message before navigation');
  });
});

