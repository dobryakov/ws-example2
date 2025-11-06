/**
 * Integration tests for API endpoints
 */

import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import apiRouter from '../../src/api';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', apiRouter);

describe('POST /api/enqueue', () => {
  const validGUID = uuidv4();
  const validText = 'Test message';

  it('should accept valid message and return 202', async () => {
    const response = await request(app)
      .post('/api/enqueue')
      .send({
        userId: validGUID,
        text: validText
      });

    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('messageId');
    expect(response.body).toHaveProperty('status', 'accepted');
  });

  it('should return 400 for missing userId', async () => {
    const response = await request(app)
      .post('/api/enqueue')
      .send({
        text: validText
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid userId');
  });

  it('should return 400 for invalid userId format', async () => {
    const response = await request(app)
      .post('/api/enqueue')
      .send({
        userId: 'not-a-guid',
        text: validText
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid userId format');
  });

  it('should return 400 for missing text', async () => {
    const response = await request(app)
      .post('/api/enqueue')
      .send({
        userId: validGUID
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid text');
  });

  it('should return 400 for non-string userId', async () => {
    const response = await request(app)
      .post('/api/enqueue')
      .send({
        userId: 123,
        text: validText
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid userId');
  });

  it('should return 400 for non-string text', async () => {
    const response = await request(app)
      .post('/api/enqueue')
      .send({
        userId: validGUID,
        text: 123
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid text');
  });
});

describe('GET /api/health', () => {
  it('should return 200 with status ok', async () => {
    const response = await request(app)
      .get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});

