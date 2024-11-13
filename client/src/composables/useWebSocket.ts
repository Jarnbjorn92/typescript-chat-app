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
    socket.value = new WebSocket(url);

    socket.value.onopen = () => {
      isConnected.value = true;
      console.log("WebSocket connected");
    };

    socket.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;

        switch (data.eventType) {
          case "message":
            messages.value.push(data.message);
            // Auto-scroll to bottom on new message
            setTimeout(() => {
              const container = document.querySelector('.messages-container');
              if (container) {
                container.scrollTop = container.scrollHeight;
              }
            }, 0);
            break;

          case "messageHistory":
            messages.value = data.messages;
            break;

          case "users":
            users.value = data.users;
            break;

          case "joined":
            console.log("Successfully joined:", data.user);
            break;

          case "error":
            error.value = data.message;
            console.error("Server error:", data.message);
            break;

          default:
            console.warn("Unknown message type:", data.eventType);
        }
      } catch (e) {
        console.error("Error parsing message:", e);
        error.value = "Failed to parse server message";
      }
    };

    socket.value.onclose = () => {
      isConnected.value = false;
      console.log("WebSocket disconnected");
      // Attempt to reconnect after 2 seconds
      setTimeout(() => {
        if (!isConnected.value) {
          console.log("Attempting to reconnect...");
          connect();
        }
      }, 2000);
    };

    socket.value.onerror = (event) => {
      error.value = "WebSocket error occurred";
      console.error("WebSocket error:", event);
    };
  };

  const sendMessage = (message: Omit<Message, "id" | "timestamp">) => {
    if (socket.value?.readyState === WebSocket.OPEN) {
      try {
        const messagePayload = {
          eventType: "message",
          content: message.content,
          roomId: message.roomId,
          messageType: message.type // Use messageType to avoid conflict
        };
        
        socket.value.send(JSON.stringify(messagePayload));
      } catch (e) {
        console.error("Error sending message:", e);
        error.value = "Failed to send message";
      }
    } else {
      error.value = "WebSocket is not connected";
    }
  };

  const joinChat = (username: string) => {
    if (socket.value?.readyState === WebSocket.OPEN) {
      try {
        socket.value.send(
          JSON.stringify({
            eventType: "join",
            username,
          })
        );
      } catch (e) {
        console.error("Error joining chat:", e);
        error.value = "Failed to join chat";
      }
    } else {
      error.value = "WebSocket is not connected";
    }
  };

  const clearError = () => {
    error.value = "";
  };

  onMounted(() => connect());
  onUnmounted(() => {
    if (socket.value) {
      socket.value.close();
      socket.value = null;
    }
  });

  return {
    isConnected,
    messages,
    users,
    error,
    sendMessage,
    joinChat,
    clearError,
  };
}