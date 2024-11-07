import { ref, onMounted, onUnmounted } from "vue";
import type { Message } from "../types";

export function useWebSocket(url: string) {
  const socket = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const messages = ref<Message[]>([]);
  const error = ref<string>("");
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 5;

  // Reconnection logic
  const reconnectTimeout = ref<number | null>(null);
  
  const connect = () => {
    try {
      socket.value = new WebSocket(url);

      socket.value.onopen = () => {
        isConnected.value = true;
        reconnectAttempts.value = 0;
        error.value = "";
        console.log("WebSocket connected");
      };

      socket.value.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data);
          messages.value.push(message);
        } catch (e) {
          console.error("Error parsing message:", e);
        }
      };

      socket.value.onclose = () => {
        isConnected.value = false;
        console.log("WebSocket disconnected");
        
        // Attempt to reconnect
        if (reconnectAttempts.value < maxReconnectAttempts) {
          reconnectAttempts.value++;
          console.log(`Reconnecting... Attempt ${reconnectAttempts.value}`);
          reconnectTimeout.value = window.setTimeout(() => {
            connect();
          }, 1000 * reconnectAttempts.value);
        } else {
          error.value = "Maximum reconnection attempts reached";
        }
      };

      socket.value.onerror = (event) => {
        error.value = "WebSocket error occurred";
        console.error("WebSocket error:", event);
      };
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to connect";
    }
  };

  const sendMessage = (message: Omit<Message, "id" | "timestamp">) => {
    if (socket.value?.readyState === WebSocket.OPEN) {
      try {
        socket.value.send(JSON.stringify(message));
      } catch (e) {
        error.value = e instanceof Error ? e.message : "Failed to send message";
      }
    } else {
      error.value = "WebSocket is not connected";
    }
  };

  const disconnect = () => {
    if (reconnectTimeout.value) {
      clearTimeout(reconnectTimeout.value);
    }
    socket.value?.close();
  };

  onMounted(() => connect());
  onUnmounted(() => disconnect());

  return {
    isConnected,
    messages,
    error,
    sendMessage,
    connect,
    disconnect
  };
}