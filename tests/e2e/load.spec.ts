/**
 * Load tests for 50 concurrent users
 */

import { test, expect } from '@playwright/test';

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const HOST = process.env.HOST || 'example.local';
const BACKEND_PORT = process.env.BACKEND_PORT || '9001';
const BACKEND_URL = `http://${HOST}:${BACKEND_PORT}`;

test.describe('Load Tests', () => {
  test('should handle 50 concurrent users', async ({ browser }) => {
    const userCount = 50;
    const users: Array<{ guid: string; context: any; page: any }> = [];
    
    // Create 50 browser contexts (simulating 50 users)
    for (let i = 0; i < userCount; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const guid = uuidv4();
      
      // Set cookie with GUID
      await context.addCookies([{
        name: 'userGUID',
        value: guid,
        domain: HOST,
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax'
      }]);
      
      await page.goto(`http://${HOST}:${process.env.FRONTEND_PORT || '9000'}/index1.html`);
      
      users.push({ guid, context, page });
    }
    
    // Wait for all pages to load
    await Promise.all(users.map(u => u.page.waitForSelector('#guidDisplay')));
    
    // Send messages to all users
    const messages = await Promise.all(
      users.map((user, index) =>
        fetch(`${BACKEND_URL}/api/enqueue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.guid,
            text: `Message for user ${index + 1}`
          })
        })
      )
    );
    
    // All messages should be accepted
    for (const response of messages) {
      expect(response.status).toBe(202);
    }
    
    // Wait for messages to be delivered
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify messages were delivered (at least some)
    let deliveredCount = 0;
    for (const user of users) {
      const messages = await user.page.locator('#messagesContainer .message').count();
      if (messages > 0) {
        deliveredCount++;
      }
    }
    
    // At least 80% should receive messages (allowing for timing issues)
    expect(deliveredCount).toBeGreaterThanOrEqual(userCount * 0.8);
    
    // Cleanup
    await Promise.all(users.map(u => u.context.close()));
  });

  test('should maintain FIFO order for multiple messages', async ({ page }) => {
    await page.goto('/index1.html');
    const guidDisplay = page.locator('#guidDisplay');
    await expect(guidDisplay).toBeVisible();
    const guid = await guidDisplay.textContent();
    
    // Wait for connection
    await page.waitForTimeout(1000);
    
    // Send 10 messages in sequence
    for (let i = 1; i <= 10; i++) {
      await page.request.post(`${BACKEND_URL}/api/enqueue`, {
        data: {
          userId: guid,
          text: `Message ${i}`
        }
      });
      await page.waitForTimeout(50); // Small delay
    }
    
    // Wait for all messages to be delivered
    await page.waitForTimeout(3000);
    
    // Check order (newest first in UI, but should be in correct order)
    const messages = await page.locator('#messagesContainer .message .message-text').allTextContents();
    
    // Messages should be in reverse order (newest first in UI)
    expect(messages[0]).toContain('Message 10');
    expect(messages[messages.length - 1]).toContain('Message 1');
  });

  test('should handle long messages', async ({ page }) => {
    await page.goto('/index1.html');
    const guidDisplay = page.locator('#guidDisplay');
    await expect(guidDisplay).toBeVisible();
    const guid = await guidDisplay.textContent();
    
    // Wait for connection
    await page.waitForTimeout(1000);
    
    // Create a very long message (100KB)
    const longMessage = 'A'.repeat(100 * 1024);
    
    const response = await page.request.post(`${BACKEND_URL}/api/enqueue`, {
      data: {
        userId: guid,
        text: longMessage
      }
    });
    
    expect(response.status()).toBe(202);
    
    // Message should be delivered
    const messageContainer = page.locator('#messagesContainer');
    await expect(messageContainer.locator('.message')).toBeVisible({ timeout: 5000 });
    
    const messageText = await messageContainer.locator('.message .message-text').first().textContent();
    expect(messageText).toHaveLength(longMessage.length);
  });
});

