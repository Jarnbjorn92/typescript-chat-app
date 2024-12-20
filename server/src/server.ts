import express from "express";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import { User, Message } from "./models";

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
connectDB();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Store connected clients with their user info
const clients = new Map<WebSocket, { userId: string; username: string }>();

const broadcast = (data: any, excludeClient?: WebSocket) => {
  const message = JSON.stringify(data);
  console.log("Broadcasting to clients:", {
    clientCount: wss.clients.size,
    messageType: data.eventType,
    data: data,
  });

  wss.clients.forEach((client) => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const broadcastUserList = async () => {
  try {
    // Get all users who are actually connected (have active WebSocket connections)
    const connectedUserIds = Array.from(clients.values()).map(
      (client) => client.userId
    );

    // Update database to reflect actual connected states
    await User.updateMany(
      { _id: { $nin: connectedUserIds } },
      { isOnline: false, lastSeen: new Date() }
    );

    await User.updateMany(
      { _id: { $in: connectedUserIds } },
      { isOnline: true }
    );

    // Fetch updated user list
    const users = await User.find({});
    console.log("Broadcasting user list - Users found:", users.length);

    broadcast({
      eventType: "users",
      users: users.map((user) => ({
        id: user ? user._id.toString() : "",
        username: user.username,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      })),
    });
  } catch (error) {
    console.error("Error broadcasting user list:", error);
  }
};

wss.on("connection", async (ws) => {
  console.log("Client connected");

  ws.on("message", async (data) => {
    try {
      const payload = JSON.parse(data.toString()) as WSMessage;
      console.log("Received message:", payload);

      switch (payload.eventType) {
        case "join": {
          const joinPayload = payload as JoinMessage;
          const { username } = joinPayload;
          console.log("\n=== Join Event ===");
          console.log("Join attempt for username:", username);

          try {
            // First, check if user already exists
            let user = await User.findOne({ username });

            if (user) {
              // If user exists, update their status
              const updatedUser = await User.findOneAndUpdate(
                { _id: user._id },
                {
                  isOnline: true,
                  lastSeen: new Date(),
                },
                { new: true }
              );

              if (!updatedUser) {
                throw new Error("Failed to update user");
              }

              user = updatedUser;
            } else {
              // If user doesn't exist, create new user
              user = await User.create({
                username,
                isOnline: true,
                lastSeen: new Date(),
              });
            }

            // Update clients map
            clients.set(ws, {
              userId: user._id.toString(),
              username: user.username,
            });

            console.log("User joined:", {
              id: user._id,
              username: user.username,
              isOnline: user.isOnline,
            });

            // Send confirmation to the joined user
            ws.send(
              JSON.stringify({
                eventType: "joined",
                user: {
                  id: user._id.toString(),
                  username: user.username,
                  isOnline: true,
                  lastSeen: user.lastSeen,
                },
              })
            );

            // Broadcast updated user list to all clients
            await broadcastUserList();
          } catch (error) {
            console.error("Error in join handler:", error);
            ws.send(
              JSON.stringify({
                eventType: "error",
                error: "Failed to join chat",
              })
            );
          }
          break;
        }

        case "message": {
          const messagePayload = payload as ChatMessage;
          const clientInfo = clients.get(ws);

          if (!clientInfo) {
            console.error("No client info found for message");
            return;
          }

          try {
            const newMessage = await Message.create({
              content: messagePayload.content,
              senderId: clientInfo.userId,
              roomId: messagePayload.roomId,
              type: messagePayload.messageType,
            });

            broadcast({
              eventType: "message",
              message: {
                id: newMessage._id.toString(),
                content: newMessage.content,
                senderId: newMessage.senderId.toString(),
                roomId: newMessage.roomId,
                type: newMessage.type,
                timestamp: newMessage.createdAt,
                createdAt: newMessage.createdAt,
              },
            });
          } catch (error) {
            console.error("Error creating message:", error);
            ws.send(
              JSON.stringify({
                eventType: "error",
                error: "Failed to process message",
              })
            );
          }
          break;
        }

        case "ping": {
          ws.send(JSON.stringify({ eventType: "pong" }));
          break;
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({
          eventType: "error",
          error: "Failed to process message",
        })
      );
    }
  });

  ws.on("close", async () => {
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      try {
        console.log("Client disconnecting:", clientInfo);

        // Update user status in database
        await User.findByIdAndUpdate(clientInfo.userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        // Remove from clients map
        clients.delete(ws);

        // Broadcast user left event
        broadcast({
          eventType: "userLeft",
          user: {
            id: clientInfo.userId,
            username: clientInfo.username,
          },
        });

        // Update all clients with new user list
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
        messages: recentMessages.map((msg) => ({
          id: msg._id.toString(),
          content: msg.content,
          senderId: msg.senderId.toString(),
          roomId: msg.roomId,
          type: msg.type,
          timestamp: msg.createdAt,
          createdAt: msg.createdAt,
        })),
      })
    );
  } catch (error) {
    console.error("Error sending initial data:", error);
    ws.send(
      JSON.stringify({
        eventType: "error",
        error: "Failed to load initial data",
      })
    );
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
