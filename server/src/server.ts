import express from "express";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import { User, Message, ChatRoom } from "./models";
import mongoose from "mongoose";

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
  type: "text" | "emoji" | "image";
}

dotenv.config();
connectDB(process.env.NODE_ENV === "development");

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Store client information
const clients = new Map<WebSocket, { userId: string; username: string }>();

// Enhanced broadcast function with detailed logging
const broadcast = (data: any, excludeClient?: WebSocket) => {
  const message = JSON.stringify(data);
  let sentCount = 0;

  console.log(
    `Broadcasting ${data.eventType} to ${wss.clients.size} clients` +
      (excludeClient ? " (excluding sender)" : "")
  );

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (client !== excludeClient) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          console.error("Error sending to client:", error);
        }
      }
    } else {
      console.log(`Client in state ${client.readyState}, not sending`);
    }
  });

  console.log(`Broadcast complete: sent to ${sentCount} clients`);
};

// Send message to a specific user
const sendToUser = (userId: string, data: any) => {
  const message = JSON.stringify(data);
  let sent = false;

  for (const [client, info] of clients.entries()) {
    if (info.userId === userId && client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        sent = true;
        break;
      } catch (error) {
        console.error(`Error sending to user ${userId}:`, error);
      }
    }
  }

  return sent;
};

const broadcastUserList = async () => {
  try {
    const users = await User.find({});
    const activeUserIds = Array.from(clients.values()).map((c) => c.userId);

    console.log(
      `Broadcasting user list with ${users.length} users, ${activeUserIds.length} active`
    );

    const updatedUsers = users.map((user) => ({
      id: user._id.toString(),
      username: user.username,
      isOnline: activeUserIds.includes(user._id.toString()),
      lastSeen: user.lastSeen,
    }));

    broadcast({ eventType: "users", users: updatedUsers });
  } catch (error) {
    console.error("Error broadcasting users:", error);
  }
};

// Initialize general room if needed
const initializeGeneralRoom = async () => {
  try {
    let generalRoom = await ChatRoom.findOne({ id: "general" });
    if (!generalRoom) {
      console.log("Creating general room...");
      generalRoom = await ChatRoom.create({
        id: "general",
        name: "General Chat",
        type: "group",
        isPrivate: false,
        participants: [],
      });
      console.log("Created general room:", generalRoom);
    }
    return generalRoom;
  } catch (error) {
    console.error("Error initializing general room:", error);
    throw error;
  }
};

// Error handling for WebSocket server
wss.on("error", (error) => {
  console.error("WebSocket server error:", error);
});

wss.on("connection", async (ws, req) => {
  console.log(`New client connected from ${req.socket.remoteAddress}`);

  // Send immediate response to confirm connection
  ws.send(
    JSON.stringify({
      eventType: "connection",
      status: "connected",
      message: "Connected to chat server",
    })
  );

  ws.on("message", async (data) => {
    try {
      const payload = JSON.parse(data.toString()) as WSMessage;
      console.log(`Received ${payload.eventType} message`);

      switch (payload.eventType) {
        case "join": {
          const { username } = payload as JoinMessage;
          try {
            let user = await User.findOne({ username });

            if (user) {
              user = await User.findOneAndUpdate(
                { _id: user._id },
                { isOnline: true, lastSeen: new Date() },
                { new: true }
              );
              console.log(`User ${username} logged in`);
            } else {
              user = await User.create({
                username,
                isOnline: true,
                lastSeen: new Date(),
              });
              console.log(`Created new user: ${username}`);
            }

            if (!user) throw new Error("Failed to create/update user");

            clients.set(ws, {
              userId: user._id.toString(),
              username: user.username,
            });

            // Ensure general room exists
            const generalRoom = await initializeGeneralRoom();

            // Add user to general room if needed
            if (
              !generalRoom.participants.some(
                (p) => p.userId?.toString() === user?._id.toString()
              )
            ) {
              await ChatRoom.updateOne(
                { id: "general" },
                {
                  $push: {
                    participants: {
                      userId: user._id,
                      role: "member",
                      joinedAt: new Date(),
                    },
                  },
                }
              );
              console.log(`Added ${username} to general room`);
            }

            // Respond to the client who joined
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
            console.error("Join error:", error);
            ws.send(
              JSON.stringify({
                eventType: "error",
                error:
                  "Failed to join: " +
                  (error instanceof Error ? error.message : "Unknown error"),
              })
            );
          }
          break;
        }

        case "message": {
          const messagePayload = payload as ChatMessage;
          const clientInfo = clients.get(ws);

          if (!clientInfo) {
            console.error("No client info for message");
            ws.send(
              JSON.stringify({
                eventType: "error",
                error: "You are not authenticated. Please join the chat first.",
              })
            );
            return;
          }

          if (!messagePayload.content?.trim()) {
            ws.send(
              JSON.stringify({
                eventType: "error",
                error: "Message cannot be empty",
              })
            );
            return;
          }

          if (!messagePayload.roomId) {
            ws.send(
              JSON.stringify({
                eventType: "error",
                error: "Room ID is required",
              })
            );
            return;
          }

          try {
            console.log(`Processing message for room ${messagePayload.roomId}`);

            // Find the room by client-facing ID
            const room = await ChatRoom.findOne({ id: messagePayload.roomId });

            if (!room) {
              ws.send(
                JSON.stringify({
                  eventType: "error",
                  error: "Room not found",
                })
              );
              return;
            }

            // Check if user is a participant in the room
            if (
              !room.participants.some(
                (p) => p.userId?.toString() === clientInfo.userId
              )
            ) {
              ws.send(
                JSON.stringify({
                  eventType: "error",
                  error: "You are not a participant in this room",
                })
              );
              return;
            }

            const newMessage = await Message.create({
              content: messagePayload.content,
              senderId: clientInfo.userId,
              roomId: room._id, // Use MongoDB _id for internal storage
              type: messagePayload.type || "text",
              status: "sent",
            });

            await ChatRoom.updateOne(
              { _id: room._id },
              { lastMessage: newMessage._id }
            );

            // Create message object for clients
            const messageForClients = {
              id: newMessage._id.toString(),
              content: newMessage.content,
              senderId: clientInfo.userId,
              roomId: messagePayload.roomId, // Use the string ID for client
              type: newMessage.type,
              status: newMessage.status,
              timestamp: newMessage.createdAt,
              createdAt: newMessage.createdAt,
            };

            // Send confirmation to sender
            ws.send(
              JSON.stringify({
                eventType: "messageSent",
                message: messageForClients,
              })
            );

            // Broadcast to everyone else
            broadcast(
              {
                eventType: "message",
                message: messageForClients,
              },
              ws
            ); // Exclude sender to avoid duplicate messages

            console.log(
              `Message broadcast complete for ${messageForClients.id}`
            );
          } catch (error) {
            console.error("Message error:", error);
            ws.send(
              JSON.stringify({
                eventType: "error",
                error:
                  "Failed to send message: " +
                  (error instanceof Error ? error.message : "Unknown error"),
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
      console.error("Processing error:", error);
      ws.send(
        JSON.stringify({
          eventType: "error",
          error:
            "Failed to process message: " +
            (error instanceof Error ? error.message : "Unknown error"),
        })
      );
    }
  });

  ws.on("close", async () => {
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      try {
        console.log(`Client disconnected: ${clientInfo.username}`);

        await User.findByIdAndUpdate(clientInfo.userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        clients.delete(ws);

        broadcast({
          eventType: "userLeft",
          user: {
            id: clientInfo.userId,
            username: clientInfo.username,
          },
        });

        await broadcastUserList();
      } catch (error) {
        console.error("Disconnect error:", error);
      }
    } else {
      console.log("Unknown client disconnected");
    }
  });

  try {
    // Ensure general room exists
    await initializeGeneralRoom();

    // Send initial data
    const [recentMessages, rooms, users] = await Promise.all([
      Message.find().sort({ createdAt: -1 }).limit(50).lean(),
      ChatRoom.find().lean(),
      User.find().lean(),
    ]);

    // Send message history
    ws.send(
      JSON.stringify({
        eventType: "messageHistory",
        messages: recentMessages.map((msg) => ({
          id: msg._id.toString(),
          content: msg.content,
          senderId: msg.senderId.toString(),
          roomId: rooms.find((r) => r._id.equals(msg.roomId))?.id || "general", // Map internal _id to client id
          type: msg.type || "text",
          status: msg.status || "sent",
          timestamp: msg.createdAt,
          createdAt: msg.createdAt,
        })),
      })
    );

    // Send room list
    ws.send(
      JSON.stringify({
        eventType: "rooms",
        rooms: rooms.map((room) => ({
          id: room.id,
          name: room.name,
          participants:
            room.participants?.map((p) => ({
              userId: p.userId?.toString(),
              role: p.role,
              joinedAt: p.joinedAt,
            })) || [],
          isPrivate: room.isPrivate || false,
          lastMessage: room.lastMessage?.toString(),
        })),
      })
    );

    // Send user list
    const activeUserIds = Array.from(clients.values()).map((c) => c.userId);
    ws.send(
      JSON.stringify({
        eventType: "users",
        users: users.map((user) => ({
          id: user._id.toString(),
          username: user.username,
          isOnline: activeUserIds.includes(user._id.toString()),
          lastSeen: user.lastSeen,
        })),
      })
    );

    console.log("Sent initial data to new client");
  } catch (error) {
    console.error("Initial data error:", error);
    ws.send(
      JSON.stringify({
        eventType: "error",
        error:
          "Failed to load initial data: " +
          (error instanceof Error ? error.message : "Unknown error"),
      })
    );
  }
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");

  // Set all users to offline
  try {
    await User.updateMany({}, { isOnline: false, lastSeen: new Date() });
    console.log("All users set to offline");
    process.exit(0);
  } catch (error) {
    console.error("Error updating users:", error);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
