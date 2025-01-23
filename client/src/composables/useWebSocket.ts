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
      return;
    }

    if (connectionQueue.value) {
      await connectionQueue.value;
      return;
    }

    connectionQueue.value = new Promise((resolve, reject) => {
      console.log("Attempting to connect to:", url);
      connectionAttempts++;

      globalSocket = new WebSocket(url);
      socket.value = globalSocket;

      const timeoutId = setTimeout(() => {
        if (globalSocket?.readyState !== WebSocket.OPEN) {
          globalSocket?.close();
          reject(new Error("Connection timeout"));
        }
      }, 10000);

      globalSocket.onopen = () => {
        clearTimeout(timeoutId);
        isConnected.value = true;
        error.value = "";
        connectionAttempts = 0;
        resolve();

        if (chatStore.currentUser && hasJoined.value) {
          joinChat(chatStore.currentUser.username).catch(console.error);
        }
      };

      globalSocket.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
          error.value = "Failed to process server message";
        }
      };

      globalSocket.onclose = (event) => {
        clearTimeout(timeoutId);
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
        setTimeout(
          connect,
          Math.min(1000 * Math.pow(2, connectionAttempts), 30000)
        );
      }
    } finally {
      connectionQueue.value = null;
    }
  };

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.eventType) {
      case "message":
        if (data.message) {
          const message: Message = {
            ...data.message,
            timestamp: new Date(data.message.timestamp),
            createdAt: new Date(data.message.createdAt),
            type: data.message.type || "text",
          };
          chatStore.addMessage(message);
        }
        break;

      case "messageHistory":
        if (data.messages) {
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
          data.users.forEach(user => chatStore.setCurrentUser(user));
        }
        break;

      case "joined":
        if (data.user) {
          handleUserJoined(data.user);
        }
        break;

      case "userLeft":
        if (data.user) {
          chatStore.updateUserStatus(data.user.id, false);
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

    if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(connect, 2000);
    } else {
      error.value = "Failed to connect after multiple attempts";
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

        globalSocket!.send(
          JSON.stringify({
            eventType: "join",
            username,
          })
        );

        setTimeout(() => {
          if (joinResolve) {
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
    connect();
    startHeartbeat();
  });

  onUnmounted(() => {
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
    messages,
    error,
    sendMessage,
    joinChat,
  };
}
