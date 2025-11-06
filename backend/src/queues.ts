/**
 * Per-user message queues with FIFO eviction policy
 * Capacity: 1000 messages per user
 */

export interface Message {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
}

export class MessageQueue {
  private readonly capacity: number = 1000;
  private items: Message[] = [];

  constructor(public readonly userId: string) {
    this.items = [];
  }

  /**
   * Add message to queue (FIFO)
   * If queue is full, remove oldest message
   */
  enqueue(message: Message): void {
    if (this.items.length >= this.capacity) {
      // Remove oldest message (FIFO eviction)
      const removed = this.items.shift();
      console.log(`[Queue ${this.userId}] Evicted oldest message: ${removed?.id}`);
    }
    this.items.push(message);
    console.log(`[Queue ${this.userId}] Enqueued message ${message.id}, queue size: ${this.items.length}`);
  }

  /**
   * Get all messages and clear queue
   */
  dequeueAll(): Message[] {
    const messages = [...this.items];
    this.items = [];
    console.log(`[Queue ${this.userId}] Dequeued ${messages.length} messages`);
    return messages;
  }

  /**
   * Get all messages without clearing
   */
  peekAll(): Message[] {
    return [...this.items];
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

/**
 * Global queue manager (per-user queues)
 */
class QueueManager {
  private queues: Map<string, MessageQueue> = new Map();

  /**
   * Get or create queue for user
   */
  getQueue(userId: string): MessageQueue {
    if (!this.queues.has(userId)) {
      this.queues.set(userId, new MessageQueue(userId));
      console.log(`[QueueManager] Created queue for user: ${userId}`);
    }
    return this.queues.get(userId)!;
  }

  /**
   * Remove queue for user (cleanup)
   */
  removeQueue(userId: string): void {
    if (this.queues.has(userId)) {
      this.queues.delete(userId);
      console.log(`[QueueManager] Removed queue for user: ${userId}`);
    }
  }

  /**
   * Get all user IDs with queues
   */
  getUserIds(): string[] {
    return Array.from(this.queues.keys());
  }
}

export const queueManager = new QueueManager();

