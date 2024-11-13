import { ref, onMounted, onUnmounted } from "vue";
import type { Message, User } from "../types";

interface WebSocketMessage {
  eventType: string;
  [key: string]: any;
}

export function useWebSocket(url: string) {
  const socket = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const messages = ref<Message[]>([]);
  const users = ref<User[]>([]);
  const error = ref("");

  const connect = () => {
    console.log("Attempting to connect to:", url);
    socket.value = new WebSocket(url);

    socket.value.onopen = () => {
      isConnected.value = true;
      console.log("WebSocket connected successfully");
    };

    socket.value.onmessage = (event) => {
      console.log("Raw message received:", event.data);
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        console.log("Parsed WebSocket message:", data);

        switch (data.eventType) {
          case "message":
            const newMessage = {
              id: data.message.id || Date.now().toString(),
              content: data.message.content,
              senderId: data.message.senderId,
              roomId: data.message.roomId,
              timestamp: data.message.timestamp || new Date(),
              type: data.message.type,
            };
            console.log("Adding new message to state:", newMessage);
            messages.value = [...messages.value, newMessage];
            break;

          case "messageHistory":
            console.log("Received message history:", data.messages);
            messages.value = data.messages.map((msg: any) => ({
              ...msg,
              timestamp: msg.timestamp || new Date(),
            }));
            break;

          case "users":
            users.value = data.users;
            break;

          case "error":
            console.error("Server error:", data.message);
            error.value = data.message;
            break;

          default:
            console.warn("Unknown message type:", data.eventType);
        }
      } catch (e) {
        console.error("Error processing message:", e, "Raw data:", event.data);
        error.value = "Failed to process server message";
      }
    };

    socket.value.onclose = (event) => {
      isConnected.value = false;
      console.log(
        "WebSocket disconnected. Code:",
        event.code,
        "Reason:",
        event.reason
      );
      setTimeout(() => {
        if (!isConnected.value) {
          connect();
        }
      }, 2000);
    };

    socket.value.onerror = (event) => {
      console.error("WebSocket error:", event);
      error.value = "WebSocket error occurred";
    };
  };

  const sendMessage = (message: Omit<Message, "id" | "timestamp">) => {
    if (!socket.value) {
      console.error("Socket is null");
      return;
    }

    if (socket.value.readyState !== WebSocket.OPEN) {
      console.error("Socket not open. State:", socket.value.readyState);
      return;
    }

    try {
      // Add message to UI immediately with pending status
      const optimisticMessage = {
        id: `pending-${Date.now()}`,
        content: message.content,
        senderId: message.senderId,
        roomId: message.roomId,
        timestamp: new Date(),
        type: message.type,
        pending: true,
      };

      messages.value = [...messages.value, optimisticMessage];

      // Send to server
      const payload = {
        eventType: "message",
        roomId: message.roomId,
        content: message.content,
        senderId: message.senderId,
        type: message.type,
      };

      console.log("Sending payload:", payload);
      socket.value.send(JSON.stringify(payload));
    } catch (e) {
      console.error("Error sending message:", e);
      error.value = "Failed to send message";
      // Remove optimistic message on error
      messages.value = messages.value.filter(
        (m) => m.id !== `pending-${Date.now()}`
      );
    }
  };

  const joinChat = (username: string) => {
    if (socket.value?.readyState === WebSocket.OPEN) {
      const payload = {
        eventType: "join",
        username,
      };
      console.log("Sending join payload:", payload);
      socket.value.send(JSON.stringify(payload));
    }
  };

  // Add a heartbeat to keep connection alive
  const startHeartbeat = () => {
    const interval = setInterval(() => {
      if (socket.value?.readyState === WebSocket.OPEN) {
        socket.value.send(JSON.stringify({ eventType: "ping" }));
      }
    }, 30000); // Every 3 seconds

    return interval;
  };

  onMounted(() => {
    connect();
    const heartbeat = startHeartbeat();

    // Cleanup heartbeat on unmount
    onUnmounted(() => {
      clearInterval(heartbeat);
      if (socket.value) {
        socket.value.close();
        socket.value = null;
      }
    });
  });

  return {
    isConnected,
    messages,
    users,
    error,
    sendMessage,
    joinChat,
  };
}
