/**
 * Basic E2E tests for WebSocket Demo
 */

import { test, expect } from '@playwright/test';

const HOST = process.env.HOST || 'example.local';
const BACKEND_PORT = process.env.BACKEND_PORT || '9001';
const BACKEND_URL = `http://${HOST}:${BACKEND_PORT}`;

test.describe('Basic Functionality', () => {
  test('should generate and display GUID on page 1', async ({ page }) => {
    await page.goto('/index1.html');
    
    const guidDisplay = page.locator('#guidDisplay');
    await expect(guidDisplay).toBeVisible();
    
    const guidText = await guidDisplay.textContent();
    expect(guidText).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  test('should display same GUID on page 2', async ({ page, context }) => {
    await page.goto('/index1.html');
    const guid1 = await page.locator('#guidDisplay').textContent();
    
    await page.goto('/index2.html');
    const guid2 = await page.locator('#guidDisplay').textContent();
    
    expect(guid1).toBe(guid2);
  });

  test('should receive message when online', async ({ page }) => {
    await page.goto('/index1.html');
    
    // Wait for GUID to be displayed
    const guidDisplay = page.locator('#guidDisplay');
    await expect(guidDisplay).toBeVisible();
    const guid = await guidDisplay.textContent();
    
    // Wait for connection status
    const status = page.locator('#status');
    await expect(status).toContainText(/Подключено|Отключено/);
    
    // Send message via API
    const response = await page.request.post(`${BACKEND_URL}/api/enqueue`, {
      data: {
        userId: guid,
        text: 'Test message from E2E'
      }
    });
    
    expect(response.status()).toBe(202);
    
    // Wait for message to appear (should be delivered within 2 seconds)
    const messageContainer = page.locator('#messagesContainer');
    await expect(messageContainer.locator('.message')).toBeVisible({ timeout: 3000 });
    
    const messageText = await messageContainer.locator('.message .message-text').first().textContent();
    expect(messageText).toContain('Test message from E2E');
  });

  test('should queue message when offline and deliver on connect', async ({ page, context }) => {
    // Disable network
    await context.setOffline(true);
    
    await page.goto('/index1.html');
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
    await page.goto('/index1.html');
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
    await page.goto('/index1.html');
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
    await page.goto('/index2.html');
    
    // Message should still be visible
    const messageContainer = page.locator('#messagesContainer');
    await expect(messageContainer.locator('.message')).toBeVisible({ timeout: 2000 });
    
    const messageText = await messageContainer.locator('.message .message-text').first().textContent();
    expect(messageText).toContain('Message before navigation');
  });
});

