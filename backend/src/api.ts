/**
 * HTTP API endpoints
 * POST /api/enqueue - Enqueue message for a user
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { isValidGUID, deliverMessage } from './sockets.js';
import { Message } from './queues.js';

const router = Router();

/**
 * POST /api/enqueue
 * Enqueue message for a user
 */
router.post('/enqueue', (req: Request, res: Response) => {
  const { userId, text } = req.body;

  // Validate userId
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      error: 'Invalid userId',
      message: 'userId is required and must be a string'
    });
  }

  if (!isValidGUID(userId)) {
    return res.status(400).json({
      error: 'Invalid userId format',
      message: 'userId must be a valid GUID (e.g., 123e4567-e89b-12d3-a456-426614174000)'
    });
  }

  // Validate text
  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      error: 'Invalid text',
      message: 'text is required and must be a string'
    });
  }

  // Create message
  const message: Message = {
    id: uuidv4(),
    userId,
    text,
    timestamp: Date.now()
  };

  console.log(`[API] Enqueueing message ${message.id} for user ${userId}`);

  // Deliver or queue message
  deliverMessage(userId, message);

  // Return 202 Accepted
  res.status(202).json({
    messageId: message.id,
    status: 'accepted'
  });
});

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

export default router;

