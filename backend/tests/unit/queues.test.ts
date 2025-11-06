/**
 * Unit tests for MessageQueue
 */

import { MessageQueue, queueManager, Message } from '../../src/queues';

describe('MessageQueue', () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue('test-user-123');
  });

  describe('enqueue', () => {
    it('should add message to queue', () => {
      const message: Message = {
        id: 'msg-1',
        userId: 'test-user-123',
        text: 'Test message',
        timestamp: Date.now()
      };

      queue.enqueue(message);
      expect(queue.size()).toBe(1);
      expect(queue.peekAll()[0]).toEqual(message);
    });

    it('should maintain FIFO order', () => {
      const msg1: Message = { id: 'msg-1', userId: 'test-user-123', text: 'First', timestamp: Date.now() };
      const msg2: Message = { id: 'msg-2', userId: 'test-user-123', text: 'Second', timestamp: Date.now() };
      const msg3: Message = { id: 'msg-3', userId: 'test-user-123', text: 'Third', timestamp: Date.now() };

      queue.enqueue(msg1);
      queue.enqueue(msg2);
      queue.enqueue(msg3);

      const all = queue.peekAll();
      expect(all[0].id).toBe('msg-1');
      expect(all[1].id).toBe('msg-2');
      expect(all[2].id).toBe('msg-3');
    });

    it('should evict oldest message when capacity exceeded', () => {
      const capacity = 1000;
      
      // Fill queue to capacity
      for (let i = 0; i < capacity; i++) {
        queue.enqueue({
          id: `msg-${i}`,
          userId: 'test-user-123',
          text: `Message ${i}`,
          timestamp: Date.now()
        });
      }

      expect(queue.size()).toBe(capacity);

      // Add one more - should evict oldest
      const newMessage: Message = {
        id: 'msg-new',
        userId: 'test-user-123',
        text: 'New message',
        timestamp: Date.now()
      };

      queue.enqueue(newMessage);

      expect(queue.size()).toBe(capacity);
      expect(queue.peekAll()[0].id).toBe('msg-1'); // First message evicted
      expect(queue.peekAll()[queue.size() - 1].id).toBe('msg-new'); // New message at end
    });
  });

  describe('dequeueAll', () => {
    it('should return all messages and clear queue', () => {
      const msg1: Message = { id: 'msg-1', userId: 'test-user-123', text: 'First', timestamp: Date.now() };
      const msg2: Message = { id: 'msg-2', userId: 'test-user-123', text: 'Second', timestamp: Date.now() };

      queue.enqueue(msg1);
      queue.enqueue(msg2);

      const messages = queue.dequeueAll();
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe('msg-1');
      expect(messages[1].id).toBe('msg-2');
      expect(queue.isEmpty()).toBe(true);
    });

    it('should return empty array for empty queue', () => {
      const messages = queue.dequeueAll();
      expect(messages).toHaveLength(0);
    });
  });

  describe('peekAll', () => {
    it('should return all messages without clearing', () => {
      const msg1: Message = { id: 'msg-1', userId: 'test-user-123', text: 'First', timestamp: Date.now() };
      queue.enqueue(msg1);

      const messages = queue.peekAll();
      expect(messages).toHaveLength(1);
      expect(queue.size()).toBe(1); // Queue not cleared
    });
  });

  describe('size and isEmpty', () => {
    it('should return correct size', () => {
      expect(queue.size()).toBe(0);
      queue.enqueue({ id: 'msg-1', userId: 'test-user-123', text: 'Test', timestamp: Date.now() });
      expect(queue.size()).toBe(1);
    });

    it('should return true for empty queue', () => {
      expect(queue.isEmpty()).toBe(true);
      queue.enqueue({ id: 'msg-1', userId: 'test-user-123', text: 'Test', timestamp: Date.now() });
      expect(queue.isEmpty()).toBe(false);
    });
  });
});

describe('QueueManager', () => {
  beforeEach(() => {
    // Clear all queues
    const userIds = queueManager.getUserIds();
    userIds.forEach(id => queueManager.removeQueue(id));
  });

  it('should create queue for new user', () => {
    const queue = queueManager.getQueue('user-1');
    expect(queue).toBeDefined();
    expect(queue.userId).toBe('user-1');
  });

  it('should return same queue for same user', () => {
    const queue1 = queueManager.getQueue('user-1');
    const queue2 = queueManager.getQueue('user-1');
    expect(queue1).toBe(queue2);
  });

  it('should create separate queues for different users', () => {
    const queue1 = queueManager.getQueue('user-1');
    const queue2 = queueManager.getQueue('user-2');
    expect(queue1).not.toBe(queue2);
    expect(queue1.userId).toBe('user-1');
    expect(queue2.userId).toBe('user-2');
  });

  it('should remove queue', () => {
    queueManager.getQueue('user-1');
    expect(queueManager.getUserIds()).toContain('user-1');
    
    queueManager.removeQueue('user-1');
    expect(queueManager.getUserIds()).not.toContain('user-1');
  });
});

