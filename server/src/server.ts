import express from "express";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import { User, Message, ChatRoom } from "./models";

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
connectDB();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const clients = new Map<WebSocket, { userId: string; username: string }>();

const broadcast = (data: any, excludeClient?: WebSocket) => {
  const message = JSON.stringify(data);
  console.log("Broadcasting:", { clientCount: wss.clients.size, data });

  wss.clients.forEach((client) => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const broadcastUserList = async () => {
  try {
    const connectedUserIds = Array.from(clients.values()).map(
      (client) => client.userId
    );

    await User.updateMany(
      { _id: { $nin: connectedUserIds } },
      { isOnline: false, lastSeen: new Date() }
    );

    await User.updateMany(
      { _id: { $in: connectedUserIds } },
      { isOnline: true }
    );

    const users = await User.find({});
    console.log("Broadcasting users:", users.length);

    broadcast({
      eventType: "users",
      users: users.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      })),
    });
  } catch (error) {
    console.error("Error broadcasting users:", error);
  }
};

wss.on("connection", async (ws) => {
  console.log("Client connected");

  ws.on("message", async (data) => {
    try {
      const payload = JSON.parse(data.toString()) as WSMessage;
      console.log("Received:", payload);

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
            } else {
              user = await User.create({
                username,
                isOnline: true,
                lastSeen: new Date(),
              });
            }

            if (!user) throw new Error("Failed to create/update user");

            clients.set(ws, {
              userId: user._id.toString(),
              username: user.username,
            });

            // Ensure user is in general room
            let generalRoom = await ChatRoom.findOne({ id: "general" });
            if (!generalRoom) {
              generalRoom = await ChatRoom.create({
                id: "general",
                name: "General Chat",
                isPrivate: false,
                participants: [
                  {
                    userId: user._id.toString(),
                    role: "member",
                    joinedAt: new Date(),
                  },
                ],
              });
            } else if (
              !generalRoom.participants.some(
                (p) => p.userId?.toString() === user._id.toString()
              )
            ) {
              await ChatRoom.updateOne(
                { id: "general" },
                {
                  $push: {
                    participants: {
                      userId: user._id.toString(),
                      role: "member",
                      joinedAt: new Date(),
                    },
                  },
                }
              );
            }

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

            await broadcastUserList();
          } catch (error) {
            console.error("Join error:", error);
            ws.send(
              JSON.stringify({
                eventType: "error",
                error: "Failed to join",
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
            return;
          }

          try {
            const newMessage = await Message.create({
              content: messagePayload.content,
              senderId: clientInfo.userId,
              roomId: messagePayload.roomId,
              type: messagePayload.type,
              status: "sent",
            });

            const room = await ChatRoom.findOne({ id: messagePayload.roomId });
            if (room) {
              await ChatRoom.updateOne(
                { id: messagePayload.roomId },
                { lastMessage: newMessage._id }
              );
            }

            broadcast({
              eventType: "message",
              message: {
                id: newMessage._id.toString(),
                content: newMessage.content,
                senderId: newMessage.senderId.toString(),
                roomId: newMessage.roomId,
                type: newMessage.type,
                status: newMessage.status,
                timestamp: newMessage.createdAt,
                createdAt: newMessage.createdAt,
              },
            });
          } catch (error) {
            console.error("Message error:", error);
            ws.send(
              JSON.stringify({
                eventType: "error",
                error: "Failed to send message",
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
          error: "Failed to process message",
        })
      );
    }
  });

  ws.on("close", async () => {
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      try {
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
    }
  });

  try {
    const [recentMessages, rooms] = await Promise.all([
      Message.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("senderId", "username"),
      ChatRoom.find(),
    ]);

    ws.send(
      JSON.stringify({
        eventType: "messageHistory",
        messages: recentMessages.map((msg) => ({
          id: msg._id.toString(),
          content: msg.content,
          senderId: msg.senderId.toString(),
          roomId: msg.roomId,
          type: msg.type,
          status: msg.status,
          timestamp: msg.createdAt,
          createdAt: msg.createdAt,
        })),
      })
    );

    ws.send(
      JSON.stringify({
        eventType: "rooms",
        rooms: rooms.map((room) => ({
          id: room.id,
          name: room.name,
          participants: room.participants,
          isPrivate: room.isPrivate,
          lastMessage: room.lastMessage,
        })),
      })
    );
  } catch (error) {
    console.error("Initial data error:", error);
    ws.send(
      JSON.stringify({
        eventType: "error",
        error: "Failed to load initial data",
      })
    );
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
