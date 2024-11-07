import express from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import type { Message, User } from './types';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Store connected clients
const clients = new Map<WebSocket, User>();

// Broadcast to all connected clients
const broadcast = (message: any) => {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    try {
      const message: Message = JSON.parse(data.toString());
      
      // Add server-side properties
      const fullMessage: Message = {
        ...message,
        id: Date.now().toString(),
        timestamp: new Date()
      };

      // Broadcast the message to all clients
      broadcast(fullMessage);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    // Remove client from connected clients
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});