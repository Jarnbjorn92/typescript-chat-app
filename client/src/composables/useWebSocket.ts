import { ref, onMounted, onUnmounted } from "vue";
import type { Message, WebSocketMessage, User } from "../types";
import { useChatStore } from "../stores/chat";

// Keep track of existing connections
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
  let reconnectTimeout: ReturnType<typeof setTimeout>;
  let heartbeatInterval: ReturnType<typeof setInterval>;

  const connect = () => {
    if (globalSocket?.readyState === WebSocket.OPEN) {
      console.log("Using existing socket connection");
      socket.value = globalSocket;
      isConnected.value = true;
      return;
    }

    if (globalSocket?.readyState === WebSocket.CONNECTING) {
      console.log("Connection already in progress");
      return;
    }

    console.log("Attempting to connect to:", url);
    connectionAttempts++;

    globalSocket = new WebSocket(url);
    socket.value = globalSocket;

    globalSocket.onopen = () => {
      console.log("WebSocket connected successfully");
      isConnected.value = true;
      error.value = "";
      connectionAttempts = 0;

      // Rejoin chat if we were previously connected
      if (chatStore.currentUser && hasJoined.value) {
        joinChat(chatStore.currentUser.username);
      }
    };

    globalSocket.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log("Received websocket message:", data);

        switch (data.eventType) {
          case "message":
            if (data.message) {
              const message: Message = {
                ...data.message,
                id: data.message.id || data.message.id,
                timestamp: new Date(data.message.timestamp),
                createdAt: new Date(data.message.createdAt),
                type: data.message.type || "text",
              };
              messages.value = messages.value.filter((m) => !m.pending);
              messages.value.push(message);
              chatStore.addMessage(message);
            }
            break;

          case "messageHistory":
            if (data.messages) {
              const normalizedMessages = data.messages.map((msg) => ({
                ...msg,
                id: msg.id || msg.id,
                timestamp: new Date(msg.timestamp),
                createdAt: new Date(msg.createdAt),
                type: msg.type || "text",
              }));
              messages.value = normalizedMessages;
              chatStore.setMessages(normalizedMessages);
            }
            break;

          case "users":
            if (data.users) {
              console.log("Received users update:", data.users);
              const normalizedUsers: User[] = data.users.map((user) => ({
                id: user.id || user.id,
                username: user.username,
                isOnline:
                  user.id === chatStore.currentUser?.id ? true : user.isOnline,
                lastSeen: user.lastSeen ? new Date(user.lastSeen) : new Date(),
              }));
              chatStore.setUsers(normalizedUsers);
            }
            break;

          case "joined":
            if (data.user) {
              console.log("User joined:", data.user);
              const normalizedUser: User = {
                id: data.user.id || data.user.id,
                username: data.user.username,
                isOnline: true,
                lastSeen: data.user.lastSeen
                  ? new Date(data.user.lastSeen)
                  : new Date(),
              };

              // Set the current user first if this is our join response
              if (
                !chatStore.currentUser ||
                data.user.username === chatStore.currentUser.username
              ) {
                chatStore.setCurrentUser(normalizedUser);
              }

              // Then add to users list
              chatStore.addUser(normalizedUser);

              // Resolve the join promise if it exists
              if (joinResolve) {
                joinResolve();
                joinResolve = null;
              }
            }
            break;

          case "userLeft":
            if (data.user) {
              console.log("User left:", data.user);
              const userId = data.user.id || data.user.id;
              chatStore.updateUserStatus(userId, false);
            }
            break;

          case "error":
            error.value = data.error || "An error occurred";
            console.error("WebSocket error message:", data.error);
            break;
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
        error.value = "Failed to process server message";
      }
    };

    globalSocket.onclose = (event) => {
      console.log(
        "WebSocket disconnected. Code:",
        event.code,
        "Reason:",
        event.reason
      );
      isConnected.value = false;
      socket.value = null;
      globalSocket = null;

      // Mark other users as offline
      chatStore.users.forEach((user) => {
        if (user.id !== chatStore.currentUser?.id) {
          chatStore.updateUserStatus(user.id, false);
        }
      });

      // Attempt to reconnect if we haven't exceeded max attempts
      if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connect, 2000);
      } else {
        error.value = "Failed to connect after multiple attempts";
      }
    };

    globalSocket.onerror = (event) => {
      console.error("WebSocket error:", event);
      error.value = "Connection error occurred";
      isConnected.value = false;
    };
  };

  const sendMessage = (
    messageData: Omit<Message, "id" | "createdAt" | "timestamp">
  ) => {
    if (!globalSocket || globalSocket.readyState !== WebSocket.OPEN) {
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
        timestamp: now,
        createdAt: now,
        pending: true,
      };

      messages.value.push(optimisticMessage);
      chatStore.addMessage(optimisticMessage);

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
        console.log("Sending join payload for:", username);
        joinResolve = resolve; // Store resolve function to call when we get server response
        hasJoined.value = true;

        globalSocket!.send(
          JSON.stringify({
            eventType: "join",
            username,
          })
        );

        // Add timeout to reject if server doesn't respond
        setTimeout(() => {
          if (joinResolve) {
            joinResolve = null;
            hasJoined.value = false;
            reject(new Error("Join timeout - no response from server"));
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
    }, 30000); // Send heartbeat every 30 seconds
  };

  onMounted(() => {
    connect();
    startHeartbeat();
  });

  onUnmounted(() => {
    hasJoined.value = false;
    joinResolve = null;

    if (chatStore.currentUser) {
      chatStore.updateUserStatus(chatStore.currentUser.id, false);
    }

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
