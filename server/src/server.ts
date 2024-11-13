// server/src/server.ts
import express from "express";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import { User, Message } from "./models";

// Types for WebSocket messages
interface WSMessage {
  eventType: string;
  [key: string]: any;
}

interface JoinMessage extends WSMessage {
  eventType: "join";
  username: string;
}

interface ChatMessage extends WSMessage {
  eventType: "message";
  content: string;
  roomId: string;
  messageType: "text" | "emoji" | "image";
}

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Store connected clients
const clients = new Map<WebSocket, { userId: string; username: string }>();

// Broadcast to all connected clients
const broadcast = (data: any) => {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Send updated user list to all clients
const broadcastUserList = async () => {
  const users = await User.find({});
  broadcast({
    eventType: "users",
    users: users,
  });
};

wss.on("connection", async (ws) => {
  console.log("Client connected");

  // Handle messages
  ws.on("message", async (data) => {
    try {
      const payload = JSON.parse(data.toString()) as WSMessage;

      switch (payload.eventType) {
        case "join": {
          const joinPayload = payload as JoinMessage;
          const { username } = joinPayload;
          let user = await User.findOne({ username });

          if (!user) {
            user = await User.create({
              username,
              isOnline: true,
            });
          } else {
            user.isOnline = true;
            await user.save();
          }

          clients.set(ws, { userId: user._id.toString(), username });

          // Send connection confirmation
          ws.send(
            JSON.stringify({
              eventType: "joined",
              user,
            })
          );

          // Broadcast updated user list
          await broadcastUserList();
          break;
        }

        case "message": {
          const messagePayload = payload as ChatMessage;
          const clientInfo = clients.get(ws);
          if (!clientInfo) return;

          try {
            const newMessage = await Message.create({
              content: messagePayload.content,
              senderId: clientInfo.userId,
              roomId: messagePayload.roomId,
              type: messagePayload.messageType,
            });

            // Broadcast message directly with the client info we already have
            broadcast({
              eventType: "message",
              message: {
                ...newMessage.toJSON(),
                senderUsername: clientInfo.username,
              },
            });
          } catch (error) {
            console.error("Error creating message:", error);
            ws.send(
              JSON.stringify({
                eventType: "error",
                message: "Failed to process message",
              })
            );
          }
          break;
        }

        default:
          console.warn("Unknown message type:", payload.eventType);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({
          eventType: "error",
          message: "Failed to process message",
        })
      );
    }
  });

  // Handle client disconnection
  ws.on("close", async () => {
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      try {
        // Update user status in database
        await User.findByIdAndUpdate(clientInfo.userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        clients.delete(ws);
        await broadcastUserList();
      } catch (error) {
        console.error("Error handling disconnection:", error);
      }
    }
    console.log("Client disconnected");
  });

  try {
    // Send existing messages
    const recentMessages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("senderId", "username");

    ws.send(
      JSON.stringify({
        eventType: "messageHistory",
        messages: recentMessages,
      })
    );

    // Send initial user list
    await broadcastUserList();
  } catch (error) {
    console.error("Error sending initial data:", error);
    ws.send(
      JSON.stringify({
        eventType: "error",
        message: "Failed to load initial data",
      })
    );
  }
});

// REST endpoints
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/api/messages", async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("senderId", "username");
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
