/**
 * Express + Socket.IO server
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import apiRouter from './api.js';
import { setupSockets } from './sockets.js';

const app = express();
const httpServer = createServer(app);

// Get configuration from environment
const HOST = process.env.HOST || 'example.local';
const PORT = parseInt(process.env.BACKEND_PORT || '9001', 10);

// CORS configuration
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: `http://${HOST}:${process.env.FRONTEND_PORT || '9000'}`,
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'] // Enable fallback to long-polling
});

// Store io globally for use in other modules
(global as any).io = io;

// Middleware
app.use(cors({
  origin: `http://${HOST}:${process.env.FRONTEND_PORT || '9000'}`,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// API routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Setup Socket.IO
setupSockets(io);

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Backend server started`);
  console.log(`[Server] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[Server] CORS enabled for http://${HOST}:${process.env.FRONTEND_PORT || '9000'}`);
  console.log(`[Server] Socket.IO transports: websocket, polling`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
});

