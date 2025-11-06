/**
 * E2E tests for connection reliability and reconnection
 */

import { test, expect } from '@playwright/test';

const HOST = process.env.HOST || 'example.local';
const FRONTEND_PORT = process.env.FRONTEND_PORT || '9000';
const BACKEND_HOST = process.env.BACKEND_HOST || HOST;
const BACKEND_PORT = process.env.BACKEND_PORT || '9001';

// In test environment with network_mode: service:frontend, use localhost:80
const BASE_URL = HOST === 'localhost'
  ? `http://localhost:80`
  : `http://${HOST}:${FRONTEND_PORT}`;
// For API calls, use frontend URL (proxied through nginx) in test environment
const BACKEND_URL = HOST === 'localhost'
  ? BASE_URL
  : `http://${BACKEND_HOST}:${BACKEND_PORT}`;

test.describe('Connection Reliability', () => {
  test('should reconnect after network interruption', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/index1.html`);
    const guidDisplay = page.locator('#guidDisplay');
    await expect(guidDisplay).toBeVisible();
    const guid = await guidDisplay.textContent();
    
    // Wait for initial connection
    const status = page.locator('#status');
    await expect(status).toContainText(/Подключено|Отключено/);
    
    // Interrupt network
    await context.setOffline(true);
    await expect(status).toContainText('Отключено', { timeout: 5000 });
    
    // Restore network
    await context.setOffline(false);
    
    // Should reconnect (with exponential backoff)
    await expect(status).toContainText('Подключено', { timeout: 35000 }); // Max backoff is 30s
  });

  test('should deliver messages after reconnection', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/index1.html`);
    const guidDisplay = page.locator('#guidDisplay');
    await expect(guidDisplay).toBeVisible();
    const guid = await guidDisplay.textContent();
    
    // Wait for connection
    await page.waitForTimeout(1000);
    
    // Interrupt network
    await context.setOffline(true);
    await page.waitForTimeout(500);
    
    // Send message while offline
    await page.request.post(`${BACKEND_URL}/api/enqueue`, {
      data: {
        userId: guid,
        text: 'Message during disconnection'
      }
    });
    
    // Restore network
    await context.setOffline(false);
    
    // Wait for reconnection
    const status = page.locator('#status');
    await expect(status).toContainText('Подключено', { timeout: 35000 });
    
    // Message should be delivered
    const messageContainer = page.locator('#messagesContainer');
    await expect(messageContainer.locator('.message')).toBeVisible({ timeout: 5000 });
    
    const messageText = await messageContainer.locator('.message .message-text').first().textContent();
    expect(messageText).toContain('Message during disconnection');
  });
});

