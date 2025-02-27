import { ref, onMounted, onUnmounted } from "vue";
import type { Message, WebSocketMessage, User } from "../../../shared/types";
import { useChatStore } from "../stores/chat";

let globalSocket: WebSocket | null = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let joinResolve: ((value: void | PromiseLike<void>) => void) | null = null;

export function useWebSocket(url: string) {
  const socket = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const isReconnecting = ref(false);
  const messages = ref<Message[]>([]);
  const error = ref("");
  const chatStore = useChatStore();
  const hasJoined = ref(false);
  const connectionQueue = ref<Promise<void> | null>(null);
  let reconnectTimeout: ReturnType<typeof setTimeout>;
  let heartbeatInterval: ReturnType<typeof setInterval>;

  const connect = async () => {
    if (globalSocket?.readyState === WebSocket.OPEN) {
      socket.value = globalSocket;
      isConnected.value = true;
      console.log("Reusing existing connection");
      return;
    }

    if (connectionQueue.value) {
      console.log("Connection already in progress, waiting...");
      await connectionQueue.value;
      return;
    }

    isReconnecting.value = connectionAttempts > 0;
    connectionQueue.value = new Promise((resolve, reject) => {
      console.log(
        `Connecting to WebSocket: ${url} (attempt ${connectionAttempts + 1})`
      );
      connectionAttempts++;

      // Close existing socket if it exists
      if (globalSocket) {
        try {
          globalSocket.close();
        } catch (e) {
          console.error("Error closing existing socket:", e);
        }
      }

      globalSocket = new WebSocket(url);
      socket.value = globalSocket;

      const timeoutId = setTimeout(() => {
        if (globalSocket?.readyState !== WebSocket.OPEN) {
          console.error("Connection timeout");
          if (globalSocket) {
            globalSocket.close();
          }
          reject(new Error("Connection timeout"));
        }
      }, 10000);

      globalSocket.onopen = () => {
        clearTimeout(timeoutId);
        console.log("WebSocket connection established!");
        isConnected.value = true;
        error.value = "";
        connectionAttempts = 0;
        isReconnecting.value = false;
        resolve();

        if (chatStore.currentUser && hasJoined.value) {
          console.log(
            "Auto-rejoining with username:",
            chatStore.currentUser.username
          );
          joinChat(chatStore.currentUser.username).catch(console.error);
        }
      };

      globalSocket.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log(`Received message: ${data.eventType}`);
          handleWebSocketMessage(data);
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e, event.data);
          error.value = "Failed to process server message";
        }
      };

      globalSocket.onclose = (event) => {
        clearTimeout(timeoutId);
        console.warn(
          `WebSocket connection closed: code=${event.code}, reason=${event.reason}, wasClean=${event.wasClean}`
        );
        handleDisconnect(event);
        reject(new Error(`WebSocket closed: ${event.code}`));
      };

      globalSocket.onerror = (event) => {
        console.error("WebSocket error:", event);
        error.value = "Connection error occurred";
        isConnected.value = false;
      };
    });

    try {
      await connectionQueue.value;
    } catch (err) {
      console.error("Connection failed:", err);
      error.value = "Failed to connect to chat server";

      if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
        console.log(
          `Will attempt to reconnect in ${delay}ms (attempt ${connectionAttempts})`
        );
        setTimeout(connect, delay);
      } else {
        error.value =
          "Failed to connect after multiple attempts. Please refresh the page and try again.";
        isReconnecting.value = false;
      }
    } finally {
      connectionQueue.value = null;
    }
  };

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.eventType) {
      case "connection":
        console.log("Connection confirmed:", data);
        break;

      case "message":
        if (data.message) {
          console.log("Received chat message:", data.message.content);
          const message: Message = {
            ...data.message,
            timestamp: new Date(data.message.timestamp),
            createdAt: new Date(data.message.createdAt),
            type: data.message.type || "text",
          };
          chatStore.addMessage(message);
        }
        break;

      case "messageSent":
        if (data.message) {
          console.log("Message sent confirmation:", data.message.id);
          // Replace pending message with confirmed one
          const message: Message = {
            ...data.message,
            timestamp: new Date(data.message.timestamp),
            createdAt: new Date(data.message.createdAt),
            type: data.message.type || "text",
          };
          chatStore.updateOrAddMessage(message);
        }
        break;

      case "messageHistory":
        if (data.messages) {
          console.log(
            `Received message history: ${data.messages.length} messages`
          );
          const normalizedMessages = data.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            createdAt: new Date(msg.createdAt),
            type: msg.type || "text",
          }));
          chatStore.setMessages(normalizedMessages);
        }
        break;

      case "users":
        if (data.users) {
          console.log(`Received users update: ${data.users.length} users`);
          chatStore.setUsers(data.users);
        }
        break;

      case "joined":
        if (data.user) {
          console.log("Join confirmation received:", data.user.username);
          handleUserJoined(data.user);
        }
        break;

      case "userLeft":
        if (data.user) {
          console.log("User left notification:", data.user.username);
          chatStore.updateUserStatus(data.user.id, false);
        }
        break;

      case "rooms":
        if (data.rooms) {
          console.log(`Received rooms: ${data.rooms.length} rooms`);
          data.rooms.forEach((room) => chatStore.addRoom(room));
        }
        break;

      case "error":
        error.value = data.error || "An error occurred";
        console.error("WebSocket error message:", data.error);
        break;
    }
  };

  const handleDisconnect = (event: CloseEvent) => {
    console.log(
      "WebSocket disconnected. Code:",
      event.code,
      "Reason:",
      event.reason
    );
    isConnected.value = false;
    socket.value = null;
    globalSocket = null;

    chatStore.handleDisconnect();

    if (!isReconnecting.value && connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(connect, 2000);
    } else if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
      error.value =
        "Failed to connect after multiple attempts. Please refresh the page and try again.";
    }
  };

  const handleUserJoined = (user: User) => {
    const normalizedUser: User = {
      id: user.id,
      username: user.username,
      isOnline: true,
      lastSeen: user.lastSeen ? new Date(user.lastSeen) : new Date(),
    };

    if (
      !chatStore.currentUser ||
      user.username === chatStore.currentUser.username
    ) {
      chatStore.setCurrentUser(normalizedUser);
    }
    chatStore.addUser(normalizedUser);

    if (joinResolve) {
      joinResolve();
      joinResolve = null;
    }
  };

  const sendMessage = (
    messageData: Omit<Message, "id" | "createdAt" | "timestamp">
  ) => {
    if (!globalSocket || globalSocket.readyState !== WebSocket.OPEN) {
      console.error("Socket not ready:", {
        socketExists: !!globalSocket,
        readyState: globalSocket?.readyState,
      });
      error.value = "Not connected to server";
      return;
    }

    try {
      const now = new Date();
      const optimisticMessage: Message = {
        id: `pending-${now.getTime()}`,
        content: messageData.content,
        senderId: messageData.senderId,
        roomId: messageData.roomId,
        type: messageData.type,
        status: "sent",
        timestamp: now,
        createdAt: now,
        pending: true,
      };

      messages.value.push(optimisticMessage);
      chatStore.addMessage(optimisticMessage);

      console.log("Sending WebSocket message:", messageData);
      globalSocket.send(
        JSON.stringify({
          eventType: "message",
          content: messageData.content,
          roomId: messageData.roomId,
          type: messageData.type,
        })
      );
    } catch (e) {
      console.error("Error sending message:", e);
      error.value = "Failed to send message";
      messages.value = messages.value.filter((m) => !m.pending);
      chatStore.messages = chatStore.messages.filter((m) => !m.pending);
    }
  };

  const joinChat = (username: string) => {
    if (hasJoined.value) {
      console.log("Already joined, skipping");
      return Promise.resolve();
    }

    if (!globalSocket || globalSocket.readyState !== WebSocket.OPEN) {
      console.error("Cannot join - socket not ready");
      return Promise.reject(new Error("Socket not ready"));
    }

    return new Promise<void>((resolve, reject) => {
      try {
        joinResolve = resolve;
        hasJoined.value = true;

        console.log("Sending join request with username:", username);
        globalSocket!.send(
          JSON.stringify({
            eventType: "join",
            username,
          })
        );

        setTimeout(() => {
          if (joinResolve) {
            console.error("Join timeout");
            joinResolve = null;
            hasJoined.value = false;
            reject(new Error("Join timeout"));
          }
        }, 5000);
      } catch (e) {
        hasJoined.value = false;
        joinResolve = null;
        console.error("Error joining chat:", e);
        error.value = "Failed to join chat";
        reject(e);
      }
    });
  };

  const startHeartbeat = () => {
    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      if (globalSocket?.readyState === WebSocket.OPEN) {
        globalSocket.send(JSON.stringify({ eventType: "ping" }));
      }
    }, 30000);
  };

  onMounted(() => {
    console.log("useWebSocket mounted, connecting...");
    connect();
    startHeartbeat();
  });

  onUnmounted(() => {
    console.log("useWebSocket unmounting, cleaning up");
    hasJoined.value = false;
    joinResolve = null;
    chatStore.handleDisconnect();
    clearInterval(heartbeatInterval);
    clearTimeout(reconnectTimeout);

    if (globalSocket) {
      globalSocket.close();
      globalSocket = null;
    }
  });

  return {
    isConnected,
    isReconnecting,
    messages,
    error,
    sendMessage,
    joinChat,
  };
}
